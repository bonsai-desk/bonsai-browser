import React, { useRef, useState } from 'react';
import styled, { css } from 'styled-components';
import { observer } from 'mobx-react-lite';
import { ipcRenderer } from 'electron';
import { Instance } from 'mobx-state-tree';
import { runInAction } from 'mobx';
import { useStore, View } from '../store/tab-page-store';
import { goBack, goForward, headsOnNode, INode } from '../store/history-store';
import { IWorkSpaceStore } from '../store/workspace/workspace-store';
import { Workspace } from '../store/workspace/workspace';
import plusImg from '../../assets/plus.svg';
import NavigatorTabModal from './NavigatorTabModal';

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
  //background-color: gray;
  //border: #936943;
  //border-style: solid;
  //border-width: 5px 5px 5px 0;
  //background: #ffdfb4;
  border-radius: 10px;
  overflow: scroll;
  display: flex;
  flex-direction: column;
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
  margin: 1rem 0 1rem 0;
  background-color: rgba(0, 0, 0, 0.25);
  border-radius: 50%;
  transition-duration: 0.25s;
  :hover {
    background-color: rgba(0, 0, 0, 0.5);
  }
`;

const Plus = styled.div`
  width: 1rem;
  height: 1rem;
  background-image: url(${plusImg});
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
  #BacklinkToWorkspace + #BacklinkToWorkspace {
    margin: 1rem 0 1rem 0;
  }
`;

const Title = styled.div`
  margin: 1rem 0 1rem 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  //color: #483526;
  color: white;
`;

const NavigatorHover = styled.div`
  ${({ active }: { active: boolean }) => {
    if (active) {
      return css`
        background-color: rgba(0, 0, 0, 0.7);
      `;
    }
    return css`
      background-color: rgba(0, 0, 0, 0.1);
    `;
  }}
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transition-duration: 0.25s;
`;

const AddToWorkspaceButtonParent = styled.div`
  transition-duration: 0.25s;
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  align-content: center;
  justify-content: center;
  height: 3rem;
  background-color: rgba(0, 0, 0, 0.5);
  :hover {
    background-color: rgba(0, 0, 0, 0.75);
  }
`;

const NavigatorItemParent = styled.div`
  --bor: 255;

  overflow: hidden;
  border-radius: 5px;

  min-height: 3rem;

  --bw: 5px;
  width: calc(100% - 3 * var(--bw));
  border-style: solid;

  flex-grow: 1;
  position: relative;
  background-size: cover; /* <------ */
  background-repeat: no-repeat;
  ${({
    img,
    maxHeight = '5rem',
    direction = Direction.Forward,
    borderActive = false,
  }: {
    img: string;
    maxHeight?: string;
    direction?: Direction;
    borderActive?: boolean;
  }) => {
    let border = css`
      border-width: 0 0 0 var(--bw);
      margin: 0 0 0 var(--bw);
    `;
    if (direction === Direction.Back) {
      border = css`
        border-width: 0 var(--bw) 0 0;
        margin: 0 0 0 var(--bw);
      `;
    }
    const maxHeightLine = `max-height: ${maxHeight};`;
    const imgCss = css`
      background-image: ${img};
      ${maxHeightLine}
    `;
    return css`
      border-color: ${borderActive ? 'white' : 'black'};
      ${maxHeightLine}
      ${border}
      ${img ? imgCss : ''}
    `;
  }}
  user-select: none;
  cursor: default;
  font-size: 0.6rem;
  color: white;
`;

const NavigatorItemText = styled.div`
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
  width: calc(100% - 1rem);
  height: 2rem;
  overflow: hidden;
  text-overflow: ellipsis;
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
    maxHeight,
    active = true,
    dir = Direction.Forward,
    borderActive = false,
    contextMenuCallback,
  }: {
    img: string;
    text: string;
    onClick?: () => void;
    active?: boolean;
    maxHeight?: string;
    dir?: Direction;
    borderActive?: boolean;
    contextMenuCallback?: (e: any) => void;
  }) => {
    return (
      <NavigatorItemParent
        onContextMenu={contextMenuCallback}
        borderActive={borderActive}
        direction={dir}
        maxHeight={maxHeight}
        id="NavItem"
        img={img}
        onClick={onClick}
      >
        <NavigatorItemText>{text}</NavigatorItemText>
        <NavigatorHover active={active} />
      </NavigatorItemParent>
    );
  }
);

const HistoryNavigatorItem = observer(
  ({
    node,
    dir,
    parentDim,
  }: {
    parentDim: Dimensions;
    node: INode;
    dir: Direction;
  }) => {
    const { historyStore, tabPageStore } = useStore();
    let img = '';
    const heads = headsOnNode(historyStore, node);

    const maxHeight = `${(9 / 16) * parentDim.width}px`;
    const headIsOnNode = heads.length > 0;

    if (headIsOnNode) {
      const tab = tabPageStore.openTabs[heads[0][0]];
      if (tab && tab.image) {
        img = `url(${tab.image})`;
      }
    }

    const title = node.data.title ? node.data.title : node.data.url;
    return (
      <NavigatorItem
        contextMenuCallback={(e) => {
          const { pageX, pageY } = e;
          tabPageStore.setNavigatorTabModal([pageX, pageY]);
          runInAction(() => {
            tabPageStore.navigatorTabModalSelectedNodeId = node.id;
          });
        }}
        borderActive={headIsOnNode}
        dir={dir}
        maxHeight={maxHeight}
        img={img}
        onClick={() => {
          // tabPageStore.setNavigatorTabModal([0, 0]);
          if (dir === Direction.Back) {
            goBack(historyStore, node);
            ipcRenderer.send('mixpanel-track', 'click go back in navigator');
          }
          if (dir === Direction.Forward) {
            goForward(historyStore, node);
            ipcRenderer.send('mixpanel-track', 'click go forward in navigator');
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
      dir={Direction.Back}
      borderActive
      maxHeight="3rem"
      img=""
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
      <HistoryNavigatorItem
        parentDim={dim}
        key={item.id}
        node={item}
        dir={dir}
      />
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
      <AddToWorkspaceButtonParent id="BacklinkToWorkspace" onClick={callback}>
        {ws.name}
      </AddToWorkspaceButtonParent>
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
            <Plus />
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
                ipcRenderer.send(
                  'mixpanel-track',
                  'create backlink to workspace from navigator'
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
  const tabWidth = gutter - margin;
  // const tabMaxHeight = (9 / 16) * tabWidth;
  const { height } = tabPageStore.innerBounds;
  const head = historyStore.heads.get(historyStore.active);
  const leftItems = head && head.parent ? [head.parent] : [];
  const rightItems = head ? head.children.slice().reverse() : [];
  const matches = nodeInWorkspaces(head, workspaceStore);
  const [x, y] = tabPageStore.navigatorTabModal;
  const tabModalInactive = x === 0 && y === 0;
  return (
    <NavigatorParent
      ref={backRef}
      onClick={(e) => {
        if (backRef.current && e.target === backRef.current) {
          ipcRenderer.send('click-main');
          ipcRenderer.send(
            'mixpanel-track',
            'go to home from navigator border click'
          );
        }
      }}
    >
      {!tabModalInactive ? <NavigatorTabModal /> : ''}
      <Panel
        dir={Direction.Back}
        items={leftItems}
        dim={{ width: tabWidth, height, margin }}
      >
        <>
          {leftItems.length === 0 ? (
            <NavigatorItem
              dir={Direction.Back}
              active={false}
              img=""
              onClick={() => {}}
              text="None"
              maxHeight="3rem"
            />
          ) : (
            ''
          )}
          <Title>Workspaces</Title>
          {matches.map((match) => (
            <WorkspaceItem key={match.itemId} data={match} />
          ))}
          {head ? <AddToWorkspace node={head} /> : ''}
        </>
      </Panel>
      <Panel
        dir={Direction.Forward}
        items={rightItems}
        dim={{ width: tabWidth, height, margin }}
      />
    </NavigatorParent>
  );
});

export default Navigator;
