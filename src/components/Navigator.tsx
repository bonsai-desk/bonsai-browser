import React, { useRef } from 'react';
import styled, { css } from 'styled-components';
import { observer } from 'mobx-react-lite';
import { ipcRenderer } from 'electron';
import { useStore } from '../store/tab-page-store';

const NavigatorParent = styled.div`
  width: 100%;
  height: 100%;
  background: rgba(255, 0, 0, 0.25);
  display: flex;
  flex-wrap: wrap;
  align-content: center;
  justify-content: space-between;
`;

const NavigatorPanel = styled.div`
  background: rgba(0, 0, 0, 0.25);
  border-radius: 1rem;
  overflow: scroll;
  ::-webkit-scrollbar {
    display: none;
  }
  div + div {
    margin-top: 10px;
  }
  ${({
    width,
    height,
    margin,
  }: {
    width: string;
    height: string;
    margin: string;
  }) => css`
    height: ${height};
    margin: 0 ${margin} 0 ${margin};
    width: ${width};
  `}
`;

const NavigatorItem = styled.div`
  width: 100%;
  padding-top: 56.25%;
  background-color: black;
  border-radius: 1rem;
`;

const Navigator = observer(() => {
  const backRef = useRef(null);
  const { tabPageStore } = useStore();
  const gutter =
    (tabPageStore.screen.width - tabPageStore.innerBounds.width) / 2;
  const margin = 20;
  const width = gutter - 2 * margin;
  const { height } = tabPageStore.innerBounds;
  const leftItems = [1];
  const rightItems = [...Array(10).keys()];
  return (
    <NavigatorParent
      ref={backRef}
      onClick={(e) => {
        if (backRef.current && e.target === backRef.current) {
          ipcRenderer.send('click-main');
        }
      }}
    >
      <NavigatorPanel
        width={`${width}px`}
        height={`${height}px`}
        margin={`${margin}px`}
      >
        {leftItems.map((key) => (
          <NavigatorItem key={key} />
        ))}
      </NavigatorPanel>
      <NavigatorPanel
        width={`${width}px`}
        height={`${height}px`}
        margin={`${margin}px`}
      >
        {rightItems.map((key) => (
          <NavigatorItem key={key} />
        ))}
      </NavigatorPanel>
    </NavigatorParent>
  );
});

export default Navigator;
