import { observer } from 'mobx-react-lite';
import React from 'react';
import { useStore } from '../store/tab-page-store';
import { Tab } from './TabPageContent';

const FuzzyTabs = observer(() => {
  const { tabPageStore } = useStore();
  return (
    <div style={{ flexGrow: 1 }}>
      <h1>Today</h1>
      {tabPageStore.filteredTabs.map((result, idx) => {
        const { item } = result;
        return (
          <Tab
            key={item.id}
            tab={item}
            selected={idx === tabPageStore.fuzzySelection[0]}
            hover
          />
        );
      })}
    </div>
  );
});

export default FuzzyTabs;
