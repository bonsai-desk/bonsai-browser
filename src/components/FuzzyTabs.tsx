import { observer } from 'mobx-react-lite';
import React from 'react';
import styled from 'styled-components';
import { useStore } from '../store/tab-page-store';
import Tab from './Tab';

const FuzzyTabsParent = styled.div`
  background-color: red;
  flex-grow: 1;
  display: flex;
`;

export const ColumnParent = styled.div`
  display: flex;
  justify-content: center;
  flex-direction: column;
  user-select: none;
  margin-right: 1rem;
  color: white;
  background-color: blue;
  width: 15rem;
`;

const FuzzyTabs = observer(() => {
  const { tabPageStore } = useStore();
  return (
    <FuzzyTabsParent>
      <ColumnParent>
        <h1>Today</h1>
        {tabPageStore.filteredTabs.map((result, idx) => {
          const { item } = result;
          return (
            <Tab
              key={item.id}
              tab={item}
              selected={idx === tabPageStore.fuzzySelectionIndex[0]}
              hover
            />
          );
        })}
      </ColumnParent>
      <ColumnParent>
        <h1>Work Space</h1>
        {tabPageStore.filteredTabs.slice(0, 2).map((result, idx) => {
          const { item } = result;
          return (
            <Tab
              key={item.id}
              tab={item}
              selected={idx === tabPageStore.fuzzySelectionIndex[0]}
              hover
            />
          );
        })}
      </ColumnParent>
    </FuzzyTabsParent>
  );
});

export default FuzzyTabs;
