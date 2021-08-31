import React from 'react';
import styled from 'styled-components';
import { observer } from 'mobx-react-lite';
import { ipcRenderer } from 'electron';
import { useStore } from '../../store/tab-page-store';

const Background = styled.div`
  user-select: none;
  width: 100vw;
  height: 100vh;
  position: absolute;
  top: 0;
  left: 0;
  //background-color: rgba(0, 0, 0, 0.5);
  z-index: 1;
`;

const List = styled.div`
  position: absolute;
  background-color: white;
  width: 150px;
  border-radius: 10px;
  overflow: hidden;
`;

const ListHeader = styled.div`
  background-color: #abd4f5;
  border-bottom: 2px solid black;
  padding: 2px;
`;

const ListButton = styled.div`
  outline: none;
  border: none;
  margin: 0;
  width: 100%;
  padding: 2px;

  :hover {
    background-color: lightgray;
  }
`;

const SelectWorkspaceModal = observer(() => {
  const { workspaceStore } = useStore();

  const workspaces = Array.from(workspaceStore.workspaces.values());

  return (
    <Background
      style={{
        display:
          workspaceStore.chooseWorkspaceX === 0 &&
          workspaceStore.chooseWorkspaceY === 0
            ? 'none'
            : 'block',
        opacity:
          workspaceStore.chooseWorkspaceX === 0 &&
          workspaceStore.chooseWorkspaceY === 0
            ? 0
            : 100,
      }}
      onClick={() => {
        workspaceStore.setChooseWorkspacePos(0, 0);
      }}
    >
      <List
        style={{
          left: workspaceStore.chooseWorkspaceX,
          top: workspaceStore.chooseWorkspaceY,
        }}
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <ListHeader>Add to workspace</ListHeader>
        {workspaces.map((workspace, i) => {
          return (
            <ListButton
              key={workspace.id}
              style={{
                borderBottom:
                  i !== workspaces.length - 1 ? '1px solid black' : 'none',
              }}
              onClick={() => {
                workspaceStore.setChooseWorkspacePos(0, 0);

                const tab = workspaceStore.selectedTab;
                if (typeof workspace !== 'undefined') {
                  workspace.createItem(
                    tab.url,
                    tab.title,
                    tab.image,
                    tab.favicon,
                    workspace.inboxGroup
                  );
                  ipcRenderer.send(
                    'mixpanel-track',
                    'create backlink to workspace from home'
                  );
                }
              }}
            >
              {workspace.name}
            </ListButton>
          );
        })}
      </List>
    </Background>
  );
});

export default SelectWorkspaceModal;
