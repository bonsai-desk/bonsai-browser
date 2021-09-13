import { observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';
import React from 'react';
import { useStore, View } from '../store/tab-page-store';
import { ModalBackground, ModalParent, ModalSheet } from './History/style';

interface IModal {
  view: View;
  children: React.ReactNode;
}

const GenericModal = observer(({ view, children }: IModal) => {
  const { tabPageStore } = useStore();
  return (
    <ModalParent active={tabPageStore.View === view}>
      <ModalBackground
        onClick={() => {
          runInAction(() => {
            tabPageStore.View = View.Tabs;
          });
        }}
      />
      <ModalSheet>{children}</ModalSheet>
    </ModalParent>
  );
});

export default GenericModal;
