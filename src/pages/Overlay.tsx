import React, { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import styled, { createGlobalStyle } from 'styled-components';
import { ipcRenderer } from 'electron';
import maxIcon from '../../assets/arrows-maximize.svg';
import backIcon from '../../assets/arrow-back.svg';

const GlobalStyle = createGlobalStyle`
  html,
  body {
    margin: 0;
    padding: 0;
    width: 100vw;
    height: 100vh;

    -webkit-user-select: none;
    -moz-user-select: none;
    user-select: none;
    -webkit-user-drag: none;
  }
`;

const Background = styled.div`
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;

  -webkit-user-select: none;
  -moz-user-select: none;
  user-select: none;
  -webkit-user-drag: none;
`;

const Main = styled.div`
  margin: 0 10px 0 10px;
  height: 36px;
  flex-grow: 1;
  background-color: rgba(100, 100, 100, 0.7);
  border-radius: 10px;
  box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  padding: 0 5px 0 5px;
`;

const ButtonParent = styled.div`
  width: 30px;
  height: 30px;
  border-radius: 10px;
  background-color: gray;
  display: flex;
  justify-content: center;
  align-items: center;

  :hover {
    filter: brightness(0.8);
  }
`;

const ButtonIcon = styled.img`
  width: 22px;
  height: 22px;

  -webkit-user-select: none;
  -moz-user-select: none;
  user-select: none;
  -webkit-user-drag: none;
`;

const Spacer = styled.div`
  flex-grow: 1;
`;

let animationId: number;
let mouseXStart: number;
let mouseYStart: number;

function moveWindow() {
  ipcRenderer.send('windowMoving', {
    mouseX: mouseXStart,
    mouseY: mouseYStart,
  });
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

  cancelAnimationFrame(animationId);

  mouseXStart = e.clientX;
  mouseYStart = e.clientY;

  document.addEventListener('mouseup', onMouseUp);
  animationId = requestAnimationFrame(moveWindow);
}

const sendWheel = (e: React.WheelEvent<HTMLDivElement>) => {
  ipcRenderer.send('wheel', [e.nativeEvent.deltaX, e.nativeEvent.deltaY]);
};

const Overlay = observer(() => {
  useEffect(() => {
    ipcRenderer.on('cancel-animation-frame', () => {
      cancelAnimationFrame(animationId);
    });
  }, []);

  return (
    <>
      <GlobalStyle />
      <Background id="draggable" onMouseDown={onMouseDown} onWheel={sendWheel}>
        <Main>
          <ButtonParent
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
            onClick={() => {
              ipcRenderer.send('go-back-from-floating');
            }}
          >
            <ButtonIcon src={backIcon} />
          </ButtonParent>
          <Spacer />
          <ButtonParent
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
            onClick={() => {
              ipcRenderer.send('unfloat-button');
            }}
          >
            <ButtonIcon src={maxIcon} />
          </ButtonParent>
        </Main>
      </Background>
    </>
  );
});

export default Overlay;
