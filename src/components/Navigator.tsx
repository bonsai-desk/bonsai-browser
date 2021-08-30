import React, { useRef, useState } from 'react';
import styled, { css } from 'styled-components';
import { observer } from 'mobx-react-lite';
import { ipcRenderer } from 'electron';
import { Instance } from 'mobx-state-tree';
import { useStore, View } from '../store/tab-page-store';
import { goBack, goForward, headsOnNode, INode } from '../store/history-store';
import { IWorkSpaceStore } from '../store/workspace/workspace-store';
import { Workspace } from '../store/workspace/workspace';
import hamburger from '../../assets/plus.svg';

enum Direction {
  Back,
  Forward,
}

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
  overflow: scroll;
  ::-webkit-scrollbar {
    display: none;
  }
  #NavItem + #NavItem {
    margin-top: 10px;
  }
  ${({
    width,
    height,
    direction,
  }: {
    width: string;
    height: string;
    direction: Direction;
  }) => {
    const thing =
      direction === Direction.Back ? '0 10px 10px 0' : '10px 0 0 10px';
    const borRad = `border-radius: ${thing};`;
    return css`
      height: ${height};
      width: ${width};
      ${borRad}
    `;
  }}
`;

const ButtonParent = styled.div`
  padding: 0.5rem;
  margin: 0.5rem 0 0.5rem 0;
  background-color: rgba(0, 0, 0, 0.25);
  border-radius: 50%;
  transition-duration: 0.25s;
  :hover {
    background-color: rgba(0, 0, 0, 0.5);
  }
`;

const Hamburger = styled.div`
  width: 1rem;
  height: 1rem;
  background-image: url(${hamburger});
  background-size: cover;
  background-repeat: no-repeat;
  background-position: center center;
`;

const AddToWorkspaceParent = styled.div`
  user-select: none;
  cursor: default;
  font-size: 0.75rem;
  color: white;
  width: 100%;
  white-space: nowrap;
  text-align: center;
`;

const Title = styled.div`
  margin: 1rem 0 0 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  padding: 1rem 0 0 0;
  color: white;
`;

const NavigatorHover = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transition-duration: 0.25s;
  background-color: rgba(0, 0, 0, 0.7);
`;

const NavigatorItemParent = styled.div`
  height: 3rem;
  position: relative;
  background-size: cover; /* <------ */
  background-repeat: no-repeat;
  ${({ img }: { img: string }) => {
    if (img) {
      return css`
        background-image: ${img};
      `;
    }
    return '';
  }}
  user-select: none;
  cursor: default;
  font-size: 0.6rem;
  color: white;
  width: 100%;
  //overflow: hidden;
  //padding: 0.5rem 0 0.5rem 0;
`;

const NavigatorItemText = styled.div`
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
  width: calc(100% - 1rem);
  //margin: 0 0.5rem 0 0.5rem;
  height: 2rem;
  text-overflow: ellipsis;
  overflow: hidden;
  display: -webkit-box !important;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  white-space: normal;
  z-index: 10;
`;

interface Dimensions {
  width: number;
  height: number;
  margin: number;
}

function asPx(a: number): string {
  return `${a}px`;
}

const NavigatorItem = observer(
  ({
    img,
    text,
    onClick,
  }: {
    img: string;
    text: string;
    onClick: () => void;
  }) => {
    return (
      <NavigatorItemParent id="NavItem" img={img} onClick={onClick}>
        <NavigatorItemText>{text}</NavigatorItemText>
        <NavigatorHover />
      </NavigatorItemParent>
    );
  }
);

const HistoryNavigatorItem = observer(
  ({ node, dir }: { node: INode; dir: Direction }) => {
    const { historyStore, tabPageStore } = useStore();
    let img = '';
    const heads = headsOnNode(historyStore, node);

    if (heads.length > 0) {
      const tab = tabPageStore.openTabs[heads[0][0]];
      if (tab && tab.image) {
        img = `url(${tab.image})`;
      }
    }

    const title = node.data.title ? node.data.title : node.data.url;
    return (
      <NavigatorItem
        img={img}
        onClick={() => {
          if (dir === Direction.Back) {
            goBack(historyStore, node);
          }
          if (dir === Direction.Forward) {
            goForward(historyStore, node);
          }
        }}
        text={title}
      />
    );
  }
);

const WorkspaceItem = observer(({ data }: { data: IItemPath }) => {
  const { tabPageStore, workspaceStore } = useStore();
  return (
    <NavigatorItem
      img=""
      onClick={() => {
        workspaceStore.setActiveWorkspaceId(data.workspaceId);
        tabPageStore.View = View.WorkSpace;
        const workspace = workspaceStore.workspaces.get(data.workspaceId);
        if (typeof workspace !== 'undefined') {
          workspace.centerCameraOnItem(data.itemId);
        }
        ipcRenderer.send('click-main');
      }}
      text={`${data.workspaceName} / ${data.groupName}`}
    />
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
    const { width, height } = dim;
    const navigatorItems = items.map((item) => (
      <HistoryNavigatorItem key={item.id} node={item} dir={dir} />
    ));
    return (
      <NavigatorPanel direction={dir} width={asPx(width)} height={asPx(height)}>
        <Title>{dir === Direction.Back ? 'Back' : 'Forward'}</Title>
        {navigatorItems}
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

const AddToWorkspaceButton = observer(
  ({
    ws,
    callback,
  }: {
    ws: Instance<typeof Workspace>;
    callback: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
  }) => {
    return (
      <NavigatorItemParent img="" onClick={callback}>
        {ws.name}
      </NavigatorItemParent>
    );
  }
);

const AddToWorkspace = observer(({ node }: { node: INode }) => {
  const [open, setOpen] = useState(false);
  const { workspaceStore, tabPageStore, historyStore } = useStore();
  const ws = Array.from(workspaceStore.workspaces.values());

  let webViewId: string | null = null;
  const heads = headsOnNode(historyStore, node);
  if (heads.length > 0) {
    // eslint-disable-next-line prefer-destructuring
    webViewId = heads[0][0];
  }

  return (
    <AddToWorkspaceParent
      onClick={() => {
        if (!open) {
          if (webViewId) {
            ipcRenderer.send('request-screenshot', { webViewId });
          }
          setOpen(true);
        } else {
          setOpen(false);
        }
      }}
    >
      <>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <ButtonParent>
            <Hamburger />
          </ButtonParent>
        </div>
        {open
          ? ws.map((workspace) => {
              const callback = (
                e: React.MouseEvent<HTMLDivElement, MouseEvent>
              ) => {
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
                workspace.createItem(
                  node.data.url,
                  title,
                  image,
                  favicon,
                  workspace.inboxGroup
                );
                setOpen(false);
              };
              return (
                <AddToWorkspaceButton
                  key={workspace.id}
                  ws={workspace}
                  callback={callback}
                />
              );
            })
          : ''}
      </>
    </AddToWorkspaceParent>
  );
});

const Navigator = observer(() => {
  const backRef = useRef(null);
  const { workspaceStore, tabPageStore, historyStore } = useStore();
  const gutter =
    (tabPageStore.screen.width - tabPageStore.innerBounds.width) / 2;
  const margin = 20;
  const width = gutter - margin;
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
        <>
          {leftItems.length === 0 ? (
            <NavigatorItem img="" onClick={() => {}} text="None" />
          ) : (
            ''
          )}
          <Title>Workspaces</Title>
          {matches.map((match) => (
            <WorkspaceItem key={match.itemId} data={match} />
          ))}
          {matches.length === 0 ? (
            <NavigatorItem img="" onClick={() => {}} text="None" />
          ) : (
            ''
          )}
          {head ? <AddToWorkspace node={head} /> : ''}
        </>
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
