import { observer } from 'mobx-react-lite';
import React from 'react';
import { ipcRenderer } from 'electron';
import { Instance } from 'mobx-state-tree';
import {
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Paper,
} from '@material-ui/core';
import { AddCircle } from '@material-ui/icons';
import styled from 'styled-components';
import { headsOnNode, INode } from '../store/history-store';
import { IWorkSpaceStore } from '../store/workspace/workspace-store';
import { useStore, View } from '../store/tab-page-store';
import { Workspace } from '../store/workspace/workspace';

interface IItemPath {
  workspaceId: string;
  groupId: string;
  itemId: string;
  workspaceName: string;
  groupName: string;
}

const AddToWorkspaceButton = observer(
  ({
    ws,
    callback,
  }: {
    ws: Instance<typeof Workspace>;
    callback: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
  }) => {
    return (
      <ListItemButton onClick={callback}>
        <ListItemIcon sx={{ minWidth: 25 }}>
          <AddCircle sx={{ fontSize: 15 }} />
        </ListItemIcon>
        <ListItemText
          primaryTypographyProps={{ fontSize: 10, fontWeight: 'Bold' }}
          primary={ws.name}
        />
      </ListItemButton>
    );
  }
);

function nodeInWorkspaces(
  node: INode | undefined,
  workspaceStore: IWorkSpaceStore
): IItemPath[] {
  if (node) {
    const matches: IItemPath[] = [];
    Array.from(workspaceStore.workspaces.values()).forEach((workspace) => {
      Array.from(workspace.items.values()).forEach((item) => {
        const baseUrl = item.url.split('#')[0];
        const nodeBaseUrl = node.data.url.split('#')[0];
        const match = baseUrl === nodeBaseUrl;
        if (match) {
          const workspaceId = workspace.id;
          const { groupId } = item;
          const group = workspace.groups.get(groupId);
          const itemId = item.id;
          const workspaceName = workspace.name;
          const groupName = group ? group.title : 'Inbox';
          matches.push({
            workspaceId,
            groupId,
            itemId,
            workspaceName,
            groupName,
          });
        }
      });
    });
    return matches;
  }
  return [];
}

const AddToWorkspace = observer(({ node }: { node: INode }) => {
  const { workspaceStore, tabPageStore, historyStore } = useStore();
  const ws = Array.from(workspaceStore.workspaces.values());

  let webViewId: string | null = null;
  const heads = headsOnNode(historyStore, node);
  if (heads.length > 0) {
    // eslint-disable-next-line prefer-destructuring
    webViewId = heads[0][0];
  }

  return (
    <>
      {ws.map((workspace) => {
        const callback = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
          e.stopPropagation();
          const title = node.data.title ? node.data.title : 'Untitled';
          let favicon = '';
          let image = '';
          if (webViewId) {
            const tab = tabPageStore.openTabs[webViewId];
            if (tab) {
              favicon = tab.favicon;
              image = tab.image;
            }
          }
          const item = workspace.createItem(
            node.data.url,
            title,
            image,
            favicon,
            workspace.inboxGroup
          );
          ipcRenderer.send('created-workspace-item', [item.id, workspace.id]);
          ipcRenderer.send(
            'mixpanel-track',
            'create backlink to workspace from navigator'
          );
        };
        return (
          <AddToWorkspaceButton
            key={workspace.id}
            ws={workspace}
            callback={callback}
          />
        );
      })}
    </>
  );
});

const WorkspaceItem = observer(({ data }: { data: IItemPath }) => {
  const { tabPageStore, workspaceStore } = useStore();
  return (
    <>
      <ListItemButton
        onClick={() => {
          workspaceStore.setActiveWorkspaceId(data.workspaceId);
          tabPageStore.View = View.WorkSpace;
          const workspace = workspaceStore.workspaces.get(data.workspaceId);
          if (typeof workspace !== 'undefined') {
            workspace.centerCameraOnItem(data.itemId);
          }
          ipcRenderer.send(
            'mixpanel-track',
            'click backlink to workspace in navigator'
          );
          ipcRenderer.send('click-main');
        }}
      >
        <ListItemText
          primary={`${data.workspaceName} / ${data.groupName}`}
          primaryTypographyProps={{ fontSize: 10, fontWeight: 'bold' }}
        />
      </ListItemButton>
      <Divider component="li" />
    </>
  );
});

const Scrollable = styled.div`
  height: 100%;
  overflow-y: scroll;
  &::-webkit-scrollbar {
    display: none;
  }
`;

const WorkspaceContent = observer(() => {
  const { workspaceStore, historyStore } = useStore();
  const head = historyStore.heads.get(historyStore.active);
  const matches = nodeInWorkspaces(head, workspaceStore);

  return (
    <Paper
      sx={{ fontSize: '2px', height: '100%', overflow: 'hidden', width: '95%' }}
    >
      <Scrollable>
        <List
          sx={{ width: '100%', maxWidth: 360 }}
          component="nav"
          aria-labelledby="nested-list-subheader"
          subheader={
            <ListSubheader
              sx={{ fontSize: 14 }}
              component="div"
              id="nested-list-subheader"
            >
              Linked References
            </ListSubheader>
          }
        >
          <Divider component="li" />
          {matches.map((match) => (
            <WorkspaceItem key={match.itemId} data={match} />
          ))}
        </List>

        <List
          sx={{ width: '100%', maxWidth: 360 }}
          component="nav"
          aria-labelledby="nested-list-subheader"
          subheader={
            <ListSubheader
              sx={{ fontSize: 14 }}
              component="div"
              id="nested-list-subheader"
            >
              Add to Workspace
            </ListSubheader>
          }
        >
          {head ? <AddToWorkspace node={head} /> : ''}
        </List>
      </Scrollable>
    </Paper>
  );
});

export default WorkspaceContent;
