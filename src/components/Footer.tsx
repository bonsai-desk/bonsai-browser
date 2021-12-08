import styled from 'styled-components';
import { observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';
import React from 'react';
import { ipcRenderer } from 'electron';
import { Add } from '@material-ui/icons';
import { useStore, View } from '../store/tab-page-store';
import { ToggleButton, Buttons, ButtonRow } from './Buttons';
import { color } from '../utils/jsutils';

const FooterParent = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-shrink: 0;
  height: 70px;
`;

const BottomButtonRow = styled(ButtonRow)`
  background-color: ${color('background-color')};
  border-radius: 0.25rem;
`;

const MiddleButtons = styled(BottomButtonRow)`
  position: relative;
`;

const PlusButton = styled(ToggleButton)`
  position: absolute;
  right: -2rem;
  top: 0;
`;

const WorkspaceButtons = observer(() => {
  const { tabPageStore, workspaceStore } = useStore();

  const buttons = Array.from(workspaceStore.workspaces.values()).map(
    (workspace) => {
      const active =
        tabPageStore.View === View.WorkSpace &&
        workspace.id === workspaceStore.activeWorkspaceId;
      return (
        <Buttons
          className={active ? 'is-active' : ''}
          key={workspace.id}
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
        </Buttons>
      );
    }
  );

  return (
    <>
      <MiddleButtons>
        {buttons}
        <PlusButton
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
          onClick={() => {
            const workspace =
              workspaceStore.createWorkspace('my new workspace');
            workspace.setShouldEditName(true);
            workspaceStore.setActiveWorkspaceId(workspace.id);
            runInAction(() => {
              tabPageStore.View = View.WorkSpace;
            });
          }}
        >
          <Add />
        </PlusButton>
      </MiddleButtons>
    </>
  );
});

const Footer = observer(() => {
  const { tabPageStore } = useStore();

  const footerContent =
    tabPageStore.View === View.Navigator ? null : (
      <>
        <WorkspaceButtons />
      </>
    );

  return <FooterParent id="footer">{footerContent}</FooterParent>;
});

export default Footer;
