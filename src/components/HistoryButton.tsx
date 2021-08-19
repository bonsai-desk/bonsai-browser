import { observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';
import React from 'react';
import { useStore, View } from '../store/tab-page-store';
import { HistoryButtonParent } from './History/style';

const HistoryButton = observer(() => {
  const { tabPageStore } = useStore();
  return (
    <HistoryButtonParent
      type="button"
      onClick={() => {
        runInAction(() => {
          tabPageStore.View = View.History;
        });
      }}
    >
      History
    </HistoryButtonParent>
  );
});
export default HistoryButton;
