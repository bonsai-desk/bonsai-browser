import styled, { css } from 'styled-components';
import { observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';
import React from 'react';
import { ipcRenderer } from 'electron';
import { useStore, View } from '../store/tab-page-store';
import HistoryButton from './HistoryButton';

export const NavButtonParent = styled.button`
  position: absolute;
  bottom: 10px;
  right: 145px;
  width: 125px;
  height: 50px;
  border-radius: 10px;
  border: none;
  outline: none;

  font-weight: bold;
  color: white;
  transition-duration: 0.1s;
  background-color: rgba(0, 0, 0, 0.25);

  :hover {
    background-color: rgba(0, 0, 0, 0.5);
  }
`;

const FooterParent = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-shrink: 0;
`;
const TheThing = styled.div`
  width: 50px;
  height: 50px;
  margin: 0 4px 0 4px;
  pointer-events: none;
`;
const PlusButtonParent = styled.button`
  color: white;
  font-size: 0.8rem;
  font-weight: bold;
  border: none;
  outline: none;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  margin: 0 4px 0 4px;
  overflow: hidden;
  transition-duration: 0.25s;
  background-color: rgba(0, 0, 0, 0.25);

  :hover {
    background-color: rgba(0, 0, 0, 0.5);
  }
`;
const FooterButtonParent = styled.button`
  font-size: 0.8rem;
  font-weight: bold;
  border: none;
  outline: none;
  width: 120px;
  height: calc(100% - 10px);
  border-radius: 1rem;
  margin: 0 4px 0 4px;
  overflow: hidden;
  background-color: red;
  transition-duration: 0.1s;
  color: ghostwhite;
  ${({ active }: { active: boolean }) => {
    if (active) {
      return css`
        background-color: rgba(0, 0, 0, 0.5);
        :hover {
          background-color: rgba(0, 0, 0, 0.6);
        }
      `;
    }

    return css`
      background-color: rgba(0, 0, 0, 0.25);
      :hover {
        background-color: rgba(0, 0, 0, 0.5);
      }
    `;
  }}
`;

const WorkspaceButtons = observer(() => {
  const { tabPageStore, workspaceStore } = useStore();

  const buttons = Array.from(workspaceStore.workspaces.values()).map(
    (workspace) => {
      return (
        <FooterButtonParent
          key={workspace.id}
          active={
            tabPageStore.View === View.WorkSpace &&
            workspace.id === workspaceStore.activeWorkspaceId
          }
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
          onClick={() => {
            runInAction(() => {
              if (
                tabPageStore.View === View.WorkSpace &&
                workspaceStore.activeWorkspaceId === workspace.id
              ) {
                ipcRenderer.send(
                  'mixpanel-track',
                  'toggle off workspace with button'
                );
                tabPageStore.View = View.Tabs;
              } else {
                ipcRenderer.send(
                  'mixpanel-track',
                  'toggle on workspace with button'
                );
                workspaceStore.setActiveWorkspaceId(workspace.id);
                tabPageStore.View = View.WorkSpace;
              }
            });
          }}
        >
          {workspace.name}
        </FooterButtonParent>
      );
    }
  );

  return (
    <>
      <TheThing />
      {buttons}
      <PlusButtonParent
        onMouseDown={(e) => {
          e.stopPropagation();
        }}
        onClick={() => {
          const workspace = workspaceStore.createWorkspace('my new workspace');
          workspace.setShouldEditName(true);
          workspaceStore.setActiveWorkspaceId(workspace.id);
          runInAction(() => {
            tabPageStore.View = View.WorkSpace;
          });
        }}
      >
        +
      </PlusButtonParent>
    </>
  );
});

const Footer = observer(({ onViewPage }: { onViewPage: boolean }) => {
  const { tabPageStore } = useStore();

  const footerContent =
    tabPageStore.View === View.Navigator ? null : (
      <>
        <WorkspaceButtons />
        <HistoryButton />
        <NavButtonParent
          onClick={() => {
            runInAction(() => {
              tabPageStore.View = View.NavigatorDebug;
            });
          }}
        >
          Debug
        </NavButtonParent>
      </>
    );

  return (
    <FooterParent
      id="footer"
      style={{
        position: onViewPage ? 'absolute' : 'static',
        bottom: onViewPage ? '0px' : 'auto',
        zIndex: onViewPage ? 1 : 'auto',
        height:
          tabPageStore.screen.height -
          (tabPageStore.innerBounds.y + tabPageStore.innerBounds.height),
      }}
    >
      {footerContent}
    </FooterParent>
  );
});

export default Footer;
