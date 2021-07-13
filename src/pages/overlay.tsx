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
    //background-color: rgba(1, 0, 0, 0.5);
    //-webkit-app-region: drag;
    //background-color: blue;
  }
`;

const Main = styled.div`
  //width: 100vw;
  //height: 100vh;
  width: 100vw;
  height: 100vh;
  //-webkit-app-region: drag;
  //background-color: red;
`;

let animationId: number;
let mouseX: number;
let mouseY: number;

function moveWindow() {
  ipcRenderer.send('windowMoving', { mouseX, mouseY });
  animationId = requestAnimationFrame(moveWindow);
}

function onMouseUp() {
  ipcRenderer.send('windowMoved');
  document.removeEventListener('mouseup', onMouseUp);
  cancelAnimationFrame(animationId);
}

function onMouseDown(e: React.MouseEvent<HTMLDivElement, MouseEvent>) {
  mouseX = e.clientX;
  mouseY = e.clientY;

  document.addEventListener('mouseup', onMouseUp);
  requestAnimationFrame(moveWindow);
}

const Overlay = observer(() => {
  return (
    <>
      <GlobalStyle />
      <Main id="draggable" onMouseDown={onMouseDown} />
    </>
  );
});

export default Overlay;
