import React from 'react';
import { observer } from 'mobx-react-lite';
import styled, { createGlobalStyle } from 'styled-components';
import { ipcRenderer } from 'electron';

const GlobalStyle = createGlobalStyle`
  html,
  body {
    margin: 0;
    padding: 0;
    width: 100vw;
    height: 100vh;
  }
`;

const Main = styled.div`
  width: 100vw;
  height: 100vh;
`;

let animationId: number;
let mouseX: number;
let mouseY: number;

function moveWindow() {
  ipcRenderer.send('windowMoving', { mouseX, mouseY });
  animationId = requestAnimationFrame(moveWindow);
}

function onMouseUp(e: MouseEvent) {
  if (e.button !== 0) {
    return;
  }
  ipcRenderer.send('windowMoved');
  document.removeEventListener('mouseup', onMouseUp);
  cancelAnimationFrame(animationId);
}

function onMouseDown(e: React.MouseEvent<HTMLDivElement, MouseEvent>) {
  if (e.button !== 0) {
    return;
  }

  mouseX = e.clientX;
  mouseY = e.clientY;

  document.addEventListener('mouseup', onMouseUp);
  requestAnimationFrame(moveWindow);
}

const sendWheel = (e: React.WheelEvent<HTMLDivElement>) => {
  ipcRenderer.send('wheel', [e.nativeEvent.deltaX, e.nativeEvent.deltaY]);
};

const Overlay = observer(() => {
  return (
    <>
      <GlobalStyle />
      <Main id="draggable" onMouseDown={onMouseDown} onWheel={sendWheel} />
    </>
  );
});

export default Overlay;
