import styled, { css } from 'styled-components';
import { observer } from 'mobx-react-lite';
import { ipcRenderer } from 'electron';
import React from 'react';
import { useStore } from '../store/tab-page-store';
import pinSelected from '../../assets/pin-selected.svg';
import pinUnselected from '../../assets/pin-unselected.svg';

const PinButtonParent = styled.button`
  border: none;
  outline: none;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  position: absolute;
  top: 10px;
  right: 10px;
  background-color: darkgray;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
`;
const Icon = styled.img`
  pointer-events: none;

  ${({ isPinned }: { isPinned: boolean }) =>
    css`
      width: ${isPinned ? '60' : '28'}px;
      height: ${isPinned ? '60' : '28'}px;
    `}
`;
const PinButton = observer(() => {
  const { tabPageStore } = useStore();
  return (
    <PinButtonParent
      onClick={() => {
        ipcRenderer.send('toggle-pin');
      }}
    >
      <Icon
        src={tabPageStore.isPinned ? pinSelected : pinUnselected}
        isPinned={tabPageStore.isPinned}
      />
    </PinButtonParent>
  );
});

export default PinButton;
