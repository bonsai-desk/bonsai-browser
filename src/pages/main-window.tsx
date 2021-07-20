import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import styled, { createGlobalStyle, css } from 'styled-components';
import { ipcRenderer } from 'electron';

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
    background-color: rgba(0.25, 0.25, 0.25, 0.35);

    ${({ floating }: GlobalProps) =>
      css`
        background-color: rgba(0.25, 0.25, 0.25, ${floating ? '0' : '0.35'});
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
      //display: ${isActive ? 'block' : 'none'};
      //display: none;
      width: calc(100% - ${padding}px - ${padding}px);
      height: calc(100% - ${padding}px - ${padding}px);
      margin: ${padding}px;
    `}
`;

const MainWindow = observer(() => {
  const [hasRunOnce, setHasRunOnce] = useState(false);
  const [padding, setPadding] = useState('35');
  const [isActive, setIsActive] = useState(false);

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
  }, [hasRunOnce]);

  return (
    <>
      <GlobalStyle floating={padding === ''} />
      <Background
        padding={padding === '' ? '10' : padding}
        isActive={isActive}
      />
    </>
  );
});

export default MainWindow;
