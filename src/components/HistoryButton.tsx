import { observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';
import React from 'react';
import { useStore, View } from '../store/tab-page-store';
import NavButtonParent from './NavButtonParent';

const HistoryButton = observer(() => {
  const { tabPageStore } = useStore();
  return (
    <NavButtonParent
      type="button"
      onClick={() => {
        runInAction(() => {
          tabPageStore.View = View.History;
        });
      }}
    >
      History
    </NavButtonParent>
  );
});

export default HistoryButton;
