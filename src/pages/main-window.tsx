import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import styled, { createGlobalStyle, css } from 'styled-components';
import { ipcRenderer } from 'electron';
import pinUnselected from '../../assets/pin-unselected.svg';
import pinSelected from '../../assets/pin-selected.svg';

const OPACITY = 0.0;

interface GlobalProps {
  floating: boolean;
}

const GlobalStyle = createGlobalStyle`
  html,
  body {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0.25, 0.25, 0.25, OPACITY);

    ${({ floating }: GlobalProps) =>
      css`
        background-color: rgba(0.25, 0.25, 0.25, ${floating ? 0 : OPACITY});
      `}
  }
`;

interface BackgroundProps {
  padding: string;
  isActive: boolean;
}

const Background = styled.div`
  position: absolute;
  background-color: white;

  box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.5);

  ${({ padding, isActive }: BackgroundProps) =>
    css`
      display: ${isActive ? 'block' : 'none'};
      width: calc(100% - ${padding}px - ${padding}px);
      height: calc(100% - ${padding}px - ${padding}px);
      margin: ${padding}px;
    `}
`;

const PinButton = styled.button`
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

const MainWindow = observer(() => {
  const [hasRunOnce, setHasRunOnce] = useState(false);
  const [padding, setPadding] = useState('35');
  const [isActive, setIsActive] = useState(false);
  const [isPinned, setIsPinned] = useState(false);

  useEffect(() => {
    function clickHandler() {
      ipcRenderer.send('click-main');
    }
    document.body.addEventListener('click', clickHandler);
    return () => {
      document.body.removeEventListener('click', clickHandler);
    };
  }, []);

  useEffect(() => {
    if (hasRunOnce) {
      return;
    }
    setHasRunOnce(true);
    ipcRenderer.on('set-padding', (_, newPadding) => {
      setPadding(newPadding);
    });
    ipcRenderer.on('set-active', (_, newIsActive) => {
      setIsActive(newIsActive);
    });
    ipcRenderer.on('set-pinned', (_, newIsPinned) => {
      setIsPinned(newIsPinned);
    });
  }, [hasRunOnce]);

  return (
    <>
      <GlobalStyle floating={padding === ''} />
      <Background
        padding={padding === '' ? '10' : padding}
        isActive={isActive}
      />
      <PinButton
        onClick={() => {
          ipcRenderer.send('toggle-pin');
        }}
      >
        <Icon
          src={isPinned ? pinSelected : pinUnselected}
          isPinned={isPinned}
        />
      </PinButton>
    </>
  );
});

export default MainWindow;
