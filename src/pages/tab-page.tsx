import React from 'react';
import { observer } from 'mobx-react-lite';
import styled, { createGlobalStyle } from 'styled-components';
import { makeAutoObservable, runInAction } from 'mobx';
import { ipcRenderer } from 'electron';

const GlobalStyle = createGlobalStyle`
  html,
  body {
    margin: 0;
    padding: 0;
    width: 100vw;
    height: 100vh;
  }
`;

const Background = styled.div`
  background-color: gray;
  width: 100vw;
  height: 100vh;
`;

const NewTabButton = styled.button``;

const Tabs = styled.div`
  display: flex;
  background-color: blue;
  border: 2px solid black;
`;

const Column = styled.div`
  background-color: red;
  border: 2px solid black;
  margin: 5px;
`;

const Tab = styled.div`
  width: 100px;
  height: 100px;
  background-color: green;
  border: 2px solid black;
`;

interface TabPageTab {
  id: number;

  url: string;
}

export class TabPageStore {
  tabs: Record<number, TabPageTab> = {};

  constructor() {
    makeAutoObservable(this);

    ipcRenderer.on('tabView-created-with-id', (_, id) => {
      runInAction(() => {
        this.tabs[id] = { id, url: '' };
      });
    });
    ipcRenderer.on('tab-removed', (_, id) => {
      runInAction(() => {
        delete this.tabs[id];
      });
    });
    ipcRenderer.on('url-changed', (_, [id, url]) => {
      runInAction(() => {
        this.tabs[id].url = url;
      });
    });
  }
}

function createTabs(tabPageStore: TabPageStore) {
  return (
    <Column>
      {Object.values(tabPageStore.tabs).map((tab) => {
        return (
          <Tab
            key={tab.id}
            onClick={() => {
              ipcRenderer.send('set-tab', tab.id);
            }}
          >
            {tab.url === '' ? 'New Tab' : tab.url}
          </Tab>
        );
      })}
    </Column>
  );
}

const TabPage = observer(({ tabPageStore }: { tabPageStore: TabPageStore }) => {
  return (
    <>
      <GlobalStyle />
      <Background>
        <NewTabButton
          type="button"
          onClick={() => {
            ipcRenderer.send('create-new-tab');
          }}
        >
          Create New Tab
        </NewTabButton>
        <Tabs>{createTabs(tabPageStore)}</Tabs>
      </Background>
    </>
  );
});

export default TabPage;
