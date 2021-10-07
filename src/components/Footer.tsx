import styled from 'styled-components';
import { observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';
import React from 'react';
import { ipcRenderer } from 'electron';
import { Add, Settings } from '@material-ui/icons';
import { useStore, View } from '../store/tab-page-store';
import { ToggleButton, Buttons, ButtonRow } from './Buttons';
import { color } from '../utils/jsutils';

const FooterParent = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-shrink: 0;
`;

const BottomButtonRow = styled(ButtonRow)`
  background-color: ${color('background-color')};
  border-radius: 0.25rem;
`;

const RightButtons = styled(BottomButtonRow)`
  position: absolute;
  right: 10px;
`;

const MiddleButtons = styled(BottomButtonRow)`
  position: relative;
`;

const PlusButton = styled(ToggleButton)`
  position: absolute;
  right: -2rem;
  top: 0;
`;

const SettingsParent = styled.div`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const NotificationIcon = styled.div`
  background-color: red;
  width: 15px;
  height: 15px;
  position: absolute;
  border-radius: 100%;
  right: -4px;
  top: -4px;
  pointer-events: none;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const NotificationsNumber = styled.div`
  height: 25px;
  line-height: 25px;
  font-size: 12px;
  color: white;
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

const Footer = observer(({ onViewPage }: { onViewPage: boolean }) => {
  const { tabPageStore } = useStore();

  const footerContent =
    tabPageStore.View === View.Navigator ? null : (
      <>
        <WorkspaceButtons />
        <RightButtons
        // style={{
        //   height:
        //     tabPageStore.screen.height -
        //     (tabPageStore.innerBounds.y + tabPageStore.innerBounds.height),
        // }}
        >
          <Buttons
            className={tabPageStore.View === View.History ? 'is-active' : ''}
            onClick={() => {
              runInAction(() => {
                tabPageStore.View = View.History;
              });
            }}
          >
            History
          </Buttons>
          <Buttons
            className={
              tabPageStore.View === View.NavigatorDebug ? 'is-active' : ''
            }
            onClick={() => {
              runInAction(() => {
                tabPageStore.View = View.NavigatorDebug;
              });
            }}
          >
            Debug
          </Buttons>
          <SettingsParent>
            <Buttons
              className={tabPageStore.View === View.Settings ? 'is-active' : ''}
              onClick={() => {
                runInAction(() => {
                  tabPageStore.View = View.Settings;
                });
              }}
            >
              <Settings />
            </Buttons>
            <NotificationIcon
              style={{ display: tabPageStore.seenEmailForm ? 'none' : 'flex' }}
            >
              <NotificationsNumber>1</NotificationsNumber>
            </NotificationIcon>
          </SettingsParent>
        </RightButtons>
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
