import React from 'react';
import { observer } from 'mobx-react-lite';
import styled from 'styled-components';
import { runInAction } from 'mobx';
import { ipcRenderer } from 'electron';
import { useStore } from '../store/tab-page-store';
import { headsOnNode, spawnNewWindow } from '../store/history-store';

const Parent = styled.div`
  width: 100px;
  position: absolute;
  height: 4rem;
  bottom: 0;
  right: 0;
  background-color: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(4px);
  border-radius: 5px;
  padding: 5px;
  z-index: 12;
`;

const List = styled.div`
  display: flex;
  flex-direction: column;
`;

const Background = styled.div`
  user-select: none;
  width: 100vw;
  height: 100vh;
  position: absolute;
  top: 0;
  left: 0;
  //background-color: rgba(0, 0, 0, 0.5);
  z-index: 11;
`;

const ListItem = styled.div`
  color: white;
  font-size: 1rem;
  border-radius: 5px;
  padding: 0 0 0 20px;
  :hover {
    background-color: blue;
  }
`;

const NavigatorTabModal = observer(() => {
  const { tabPageStore, historyStore } = useStore();
  const [x, y] = tabPageStore.navigatorTabModal;

  const senderId = historyStore.active;
  const nodeId = tabPageStore.navigatorTabModalSelectedNodeId;
  const node = historyStore.nodes.get(nodeId);

  const heads = headsOnNode(historyStore, node);
  const aHeadIsOnNode = heads.length > 0;

  return (
    <Background
      onClick={() => {
        tabPageStore.setNavigatorTabModal([0, 0]);
        runInAction(() => {
          tabPageStore.navigatorTabModalSelectedNodeId = '';
        });
      }}
    >
      <Parent style={{ top: y, left: x }}>
        <List>
          <ListItem
            onClick={() => {
              if (senderId && node) {
                if (aHeadIsOnNode) {
                  ipcRenderer.send('remove-tab', heads[0][0]);
                } else {
                  console.log('spawn');
                  spawnNewWindow(historyStore, senderId, node.data.url);
                }
              }
            }}
          >
            {aHeadIsOnNode ? 'Sleep' : 'Wake'}
          </ListItem>
        </List>
      </Parent>
    </Background>
  );
});

export default NavigatorTabModal;
