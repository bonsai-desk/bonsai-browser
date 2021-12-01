import { observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';
import React from 'react';
import { Modal } from '@material-ui/core';
import styled from 'styled-components';
import { useStore, View } from '../store/tab-page-store';
import { color } from '../utils/jsutils';

interface IModal {
  view: View;
  children: React.ReactNode;
}

const ModalPaper = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -80%);
  background: ${color('background-color')};
  width: 1000px;
  height: 50%;
  overflow: hidden;
  border-radius: 5px;
`;

const GenericModal = observer(({ view, children }: IModal) => {
  const { tabPageStore } = useStore();
  const handleClose = () => {
    runInAction(() => {
      tabPageStore.View = View.Tabs;
    });
  };
  return (
    <Modal onClose={handleClose} open={tabPageStore.View === view}>
      <ModalPaper>{children}</ModalPaper>
    </Modal>
  );
});

export default GenericModal;
