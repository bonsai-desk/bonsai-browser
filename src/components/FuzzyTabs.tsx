import { observer } from 'mobx-react-lite';
import React from 'react';
import styled from 'styled-components';
import { useStore } from '../store/tab-page-store';
import Tab from './Tab';

const FuzzyTabsParent = styled.div`
  flex-grow: 1;
  display: flex;
  display: flex;
  justify-content: center;
`;

export const ColumnParent = styled.div`
  display: flex;
  flex-direction: column;
  user-select: none;
  color: white;
  width: 15rem;
  margin: 0 1rem 0 1rem;
`;

const FuzzyTitle = styled.h1`
  padding-left: 4px;
  justify-content: center;
`;

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
              key={item.id}
              tab={item}
              selected={
                idx === tabPageStore.fuzzySelectionIndex[0] &&
                tabPageStore.fuzzySelectionIndex[1] === 1
              }
              hover
            />
          );
        })}
      </ColumnParent>
    </FuzzyTabsParent>
  );
});

export default FuzzyTabs;
