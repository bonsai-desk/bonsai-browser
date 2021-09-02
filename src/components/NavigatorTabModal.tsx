import React from 'react';
import { observer } from 'mobx-react-lite';
import styled from 'styled-components';
import { runInAction } from 'mobx';
import { useStore } from '../store/tab-page-store';
import { spawnNewWindow } from '../store/history-store';

const Parent = styled.div`
  width: 100px;
  height: 100px;
  position: absolute;
  bottom: 0;
  right: 0;
  z-index: 1;
`;

const Background = styled.div`
  user-select: none;
  width: 100vw;
  height: 100vh;
  position: absolute;
  top: 0;
  left: 0;
  //background-color: rgba(0, 0, 0, 0.5);
  z-index: 1;
  background-color: rgba(0, 0, 0, 0.25);
`;

const NavigatorTabModal = observer(() => {
  const { tabPageStore, historyStore } = useStore();
  const [x, y] = tabPageStore.navigatorTabModal;
  return (
    <Background
      onClick={() => {
        tabPageStore.setNavigatorTabModal([0, 0]);
        runInAction(() => {
          tabPageStore.navigatorTabModalSelectedNodeId = '';
        });
      }}
    >
      <Parent
        onClick={() => {
          const senderId = historyStore.active;
          const nodeId = tabPageStore.navigatorTabModalSelectedNodeId;
          const node = historyStore.nodes.get(nodeId);
          if (senderId && node) {
            console.log('spawn');
            spawnNewWindow(historyStore, senderId, node.data.url);
          }
        }}
        style={{ backgroundColor: 'blue', top: y, left: x }}
      >
        woo
      </Parent>
    </Background>
  );
});

export default NavigatorTabModal;
