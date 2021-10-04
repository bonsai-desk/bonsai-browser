import { observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';
import React from 'react';
import { useStore, View } from '../store/tab-page-store';
import { Buttons } from './Buttons';

const HistoryButton = observer(() => {
  const { tabPageStore } = useStore();
  return (
    <Buttons
      onClick={() => {
        runInAction(() => {
          tabPageStore.View = View.History;
        });
      }}
    >
      History
    </Buttons>
  );
});

export default HistoryButton;
