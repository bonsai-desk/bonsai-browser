import React, { useRef } from 'react';
import styled, { css } from 'styled-components';
import { observer } from 'mobx-react-lite';
import { ipcRenderer } from 'electron';
import { useStore } from '../store/tab-page-store';
import { goBack, goForward, INode } from '../store/history-store';
import { IWorkSpaceStore } from '../store/workspace/workspace-store';

const NavigatorParent = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-wrap: wrap;
  align-content: center;
  justify-content: space-between;
`;

const NavigatorPanel = styled.div`
  background: rgba(0, 0, 0, 0.25);
  border-radius: 0.5rem;
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

const NavigatorItemParent = styled.div`
  user-select: none;
  cursor: default;
  font-size: 0.75rem;
  color: white;
  width: calc(100% - 0.5rem);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  //padding-top: 56.25%;
  background-color: rgba(100, 100, 100, 1);
  padding: 0.5rem 0 0.5rem 0.5rem;
  border-radius: 0.5rem;
`;

interface Dimensions {
  width: number;
  height: number;
  margin: number;
}

function asPx(a: number) {
  return `${a}px`;
}

enum Direction {
  Back,
  Forward,
}

const NavigatorItem = observer(
  ({ node, dir }: { node: INode; dir: Direction }) => {
    const { historyStore } = useStore();
    const title = node.data.title ? node.data.title : node.data.url;
    return (
      <NavigatorItemParent
        onClick={() => {
          if (dir === Direction.Back) {
            goBack(historyStore, node);
          }
          if (dir === Direction.Forward) {
            goForward(historyStore, node);
          }
        }}
      >
        {title}
      </NavigatorItemParent>
    );
  }
);

const WorkspaceItem = observer(({ data }: { data: IItemPath }) => {
  return (
    <NavigatorItemParent
      onClick={() => {
        console.log('woo');
      }}
    >{`${data.workspaceName} / ${data.groupName}`}</NavigatorItemParent>
  );
});

const Panel = observer(
  ({
    items,
    dim,
    dir,
    children,
  }: {
    items: INode[];
    dim: Dimensions;
    dir: Direction;
    children?: JSX.Element | JSX.Element[];
  }) => {
    const { width, height, margin } = dim;
    return (
      <NavigatorPanel
        width={asPx(width)}
        height={asPx(height)}
        margin={asPx(margin)}
      >
        {items.map((item) => (
          <NavigatorItem key={item.id} node={item} dir={dir} />
        ))}
        {children}
      </NavigatorPanel>
    );
  }
);

interface IItemPath {
  workspaceId: string;
  groupId: string;
  itemId: string;
  workspaceName: string;
  groupName: string;
}

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
          const groupName = group ? group.title : 'Untitled';
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

const Navigator = observer(() => {
  const backRef = useRef(null);
  const { workspaceStore, tabPageStore, historyStore } = useStore();
  const gutter =
    (tabPageStore.screen.width - tabPageStore.innerBounds.width) / 2;
  const margin = 20;
  const width = gutter - 2 * margin;
  const { height } = tabPageStore.innerBounds;
  const head = historyStore.heads.get(historyStore.active);
  const leftItems = head && head.parent ? [head.parent] : [];
  const rightItems = head ? head.children.slice().reverse() : [];
  const matches = nodeInWorkspaces(head, workspaceStore);
  return (
    <NavigatorParent
      ref={backRef}
      onClick={(e) => {
        if (backRef.current && e.target === backRef.current) {
          ipcRenderer.send('click-main');
        }
      }}
    >
      <Panel
        dir={Direction.Back}
        items={leftItems}
        dim={{ width, height, margin }}
      >
        {matches.map((match) => (
          <WorkspaceItem key={match.itemId} data={match} />
        ))}
      </Panel>
      <Panel
        dir={Direction.Forward}
        items={rightItems}
        dim={{ width, height, margin }}
      />
    </NavigatorParent>
  );
});

export default Navigator;
