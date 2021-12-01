import { observer } from 'mobx-react-lite';
// import { runInAction } from 'mobx';
import React from 'react';
import styled, { css } from 'styled-components';
import { Modal } from '@material-ui/core';
// import { useStore } from '../store/tab-page-store';

export interface IMiniModal {
  active: boolean;
  children: React.ReactNode;
  closeCallback?: () => void;
}

export const MiniModalSheet = styled.div`
  box-shadow: rgba(0, 0, 0, 0.35) 0 5px 15px;
  //position: absolute;
  //left: 0;
  //top: 0;
  //bottom: 0;
  //right: 0;
  margin: auto;
  //width: 200px;
  //height: 200px;
  background-color: white;
  border-radius: 10px;
  //border: 2px solid white;
  //box-shadow: 0 0 5px 0 rgba(0, 0, 0, 1);
  padding: 20px;
  overflow: scroll;
  ::-webkit-scrollbar {
    display: none;
  }
`;

export const MiniModalBackground = styled.div`
  background-color: rgba(0.25, 0.25, 0.25, 0.35);
  //background-color: blue;
  position: absolute;
  left: 0;
  top: 0;
  //width: 100vw;
  //height: 100vh;
  width: 100%;
  height: 100%;
  display: flex;
  flex-wrap: wrap;
  align-content: center;
  justify-content: center;
`;

export const MiniModalParent = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;

  ${({ active }: { active: boolean }) =>
    css`
      display: ${active ? 'block' : 'none'};
    `}
`;

const MiniGenericModal = observer(
  ({ active, children, closeCallback }: IMiniModal) => {
    // const { tabPageStore } = useStore();

    return (
      <Modal
        open={active}
        onClose={() => {
          if (closeCallback) {
            closeCallback();
          }
        }}
      >
        <MiniModalBackground>
          <MiniModalSheet
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            {children}
          </MiniModalSheet>
        </MiniModalBackground>
      </Modal>
    );
  }
);

export default MiniGenericModal;
