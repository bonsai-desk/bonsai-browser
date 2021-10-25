import { observer } from 'mobx-react-lite';
import React from 'react';
import styled from 'styled-components';
import { Instance } from 'mobx-state-tree';
import { ipcRenderer } from 'electron';
import { useStore } from '../store/tab-page-store';
import Tab from './Card';
import { Item } from '../store/workspace/item';
import { TabPageTab } from '../interfaces/tab';

const FuzzyTabsParent = styled.div`
  display: flex;
  flex-grow: 1;
  //height: 100%;
  justify-content: center;
  overflow: scroll;
  ::-webkit-scrollbar {
    display: none;
  }
`;

export const ColumnParent = styled.div`
  display: flex;
  flex-direction: column;
  user-select: none;
  color: white;
  width: 200px;
  margin: 0 1rem 0 1rem;
`;

const FuzzyTitle = styled.h1`
  text-shadow: 0 0 5px #9c9c9c;
  padding-left: 4px;
  justify-content: center;
`;

export function itemToTabPageTab(item: Instance<typeof Item>): TabPageTab {
  return {
    id: parseInt(item.id, 10),
    lastAccessTime: -1, // todo
    url: item.url,
    title: item.title,
    image: item.image,
    favicon: item.favicon,
    openGraphInfo: null,
    canGoForward: false,
    canGoBack: false,
    unRooted: false,
    ancestor: undefined,
  };
}

const FuzzyTabs = observer(() => {
  const { tabPageStore } = useStore();
  return (
    <FuzzyTabsParent>
      <ColumnParent>
        <FuzzyTitle>Open</FuzzyTitle>
        {tabPageStore.filteredOpenTabs.map((result, idx) => {
          const { item } = result;
          return (
            <Tab
              key={item.id}
              tab={item}
              active
              selected={
                idx === tabPageStore.fuzzySelectionIndex[0] &&
                tabPageStore.fuzzySelectionIndex[1] === 0
              }
              hover
            />
          );
        })}
      </ColumnParent>
      <ColumnParent>
        <FuzzyTitle>Workspace</FuzzyTitle>
        {tabPageStore.filteredWorkspaceTabs.map((result, idx) => {
          const { item } = result;
          return (
            <Tab
              disableButtons
              key={item.id}
              tab={itemToTabPageTab(item)}
              selected={
                idx === tabPageStore.fuzzySelectionIndex[0] &&
                tabPageStore.fuzzySelectionIndex[1] === 1
              }
              active
              callback={() => {
                ipcRenderer.send('open-workspace-url', item.url);
              }}
              hover
            />
          );
        })}
      </ColumnParent>
    </FuzzyTabsParent>
  );
});

export default FuzzyTabs;
