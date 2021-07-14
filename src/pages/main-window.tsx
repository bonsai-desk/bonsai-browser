import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import styled, { createGlobalStyle, css } from 'styled-components';
import { ipcRenderer } from 'electron';

const GlobalStyle = createGlobalStyle`
  html,
  body {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0.25, 0.25, 0.25, 0.35);
    //-webkit-app-region: drag;
  }
`;

interface BackgroundProps {
  padding: string;
  isActive: boolean;
}

const Background = styled.div`
  position: absolute;
  background-color: white;

  ${({ padding, isActive }: BackgroundProps) =>
    css`
      display: ${isActive ? 'block' : 'none'};
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
      <GlobalStyle />
      <Background padding={padding} isActive={isActive} />
    </>
  );
});

export default MainWindow;
