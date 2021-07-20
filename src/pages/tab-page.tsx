import React, { useEffect, useRef, useState } from 'react';
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
  word-wrap: break-word;
  text-overflow: ellipsis;
  overflow: hidden;
`;

const URLBox = styled.input`
  border-radius: 10000000px;
  outline: none;
  border: 2px solid black;
  height: 22px;
  padding: 2px 2px 2px 10px;
  margin: 10px;
  width: calc(100% - 2px - 10px - 4px - 20px);
`;

interface TabPageTab {
  id: number;

  url: string;

  title: string;
}

export class TabPageStore {
  tabs: Record<number, TabPageTab> = {};

  constructor() {
    makeAutoObservable(this);

    ipcRenderer.on('tabView-created-with-id', (_, id) => {
      runInAction(() => {
        this.tabs[id] = { id, url: '', title: '' };
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
    ipcRenderer.on('title-updated', (_, [id, title]) => {
      runInAction(() => {
        this.tabs[id].title = title;
      });
    });
  }
}

function getRootDomain(url: string): string {
  const ex = /\w*\./g;
  const result = url.matchAll(ex);
  if (result !== null) {
    const results = [...result];
    if (results.length > 0) {
      const r = results[results.length - 1][0];
      return r.substring(0, r.length - 1);
    }
  }
  return '';
}

function createTabs(tabPageStore: TabPageStore) {
  const columns: Record<string, TabPageTab[]> = {};

  Object.values(tabPageStore.tabs).forEach((tab) => {
    const domain = getRootDomain(tab.url);
    if (!columns[domain]) {
      columns[domain] = [];
    }
    columns[domain].push(tab);
  });

  return Object.keys(columns).map((key) => {
    return (
      <Column key={key}>
        {[
          <div key={key}>{key}</div>,
          Object.values(columns[key]).map((tab) => {
            return (
              <Tab
                key={tab.id}
                onClick={() => {
                  ipcRenderer.send('set-tab', tab.id);
                }}
              >
                {tab.url === '' ? 'New Tab' : tab.title}
              </Tab>
            );
          }),
        ]}
      </Column>
    );
  });
}

const TabPage = observer(({ tabPageStore }: { tabPageStore: TabPageStore }) => {
  const urlBoxRef = useRef<HTMLInputElement>(null);
  const [urlFocus, setUrlFocus] = useState(false);
  const [urlText, setUrlText] = useState('');

  const [hasRunOnce, setHasRunOnce] = useState(false);
  useEffect(() => {
    if (hasRunOnce) {
      return;
    }
    setHasRunOnce(true);
    ipcRenderer.on('focus-search', () => {
      if (urlBoxRef.current != null) {
        // urlBoxRef.current.focus();
        urlBoxRef.current.select();
      }
    });
  }, [hasRunOnce]);

  return (
    <>
      <GlobalStyle />
      <Background>
        <URLBox
          type="text"
          ref={urlBoxRef}
          placeholder="Search Google or type a URL"
          value={urlText}
          onInput={(e) => {
            setUrlText(e.currentTarget.value);
          }}
          onKeyDown={(e) => {
            if (e.nativeEvent.code === 'Enter') {
              setUrlText('');
              ipcRenderer.send('search-url', urlText);
            }
          }}
          onClick={() => {
            if (urlBoxRef.current != null && !urlFocus) {
              setUrlFocus(true);
              urlBoxRef.current.select();
            }
          }}
          onBlur={() => {
            setUrlFocus(false);
            if (urlBoxRef.current != null) {
              urlBoxRef.current.blur();
              window.getSelection()?.removeAllRanges();
            }
          }}
        />
        <Tabs>{createTabs(tabPageStore)}</Tabs>
      </Background>
    </>
  );
});

export default TabPage;
