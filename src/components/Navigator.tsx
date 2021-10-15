import React, { useEffect, useRef, useState } from 'react';
import styled, { css } from 'styled-components';
import { observer } from 'mobx-react-lite';
import { ipcRenderer } from 'electron';
import { Instance } from 'mobx-state-tree';
import { runInAction } from 'mobx';
import { Close, Add } from '@material-ui/icons';
import { useStore, View } from '../store/tab-page-store';
import { goBack, goForward, headsOnNode, INode } from '../store/history-store';
import { IWorkSpaceStore } from '../store/workspace/workspace-store';
import { Workspace } from '../store/workspace/workspace';
import plusImg from '../../assets/plus.svg';
import NavigatorTabModal from './NavigatorTabModal';
import { color } from '../utils/jsutils';
import { TabPageTab } from '../interfaces/tab';
import TitleBar, { RoundButton } from '../pages/App';

enum Direction {
  Back,
  Forward,
}

const NavigatorParent = styled.div`
  position: absolute;
  top: 0;
  left: 0;
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
          if (dir === Direction.Forward) {
            const { pageX, pageY } = e;
            tabPageStore.setNavigatorTabModal([pageX, pageY]);
            runInAction(() => {
              tabPageStore.navigatorTabModalSelectedNodeId = node.id;
            });
          }
        }}
        borderActive={headIsOnNode}
        dir={dir}
        maxHeight={maxHeight}
        img={img}
        onClick={() => {
          // tabPageStore.setNavigatorTabModal([0, 0]);
          if (dir === Direction.Back) {
            goBack(historyStore);
            ipcRenderer.send('mixpanel-track', 'click go back in navigator');
          }
          if (dir === Direction.Forward) {
            goForward(historyStore);
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
    title = 'Panel',
  }: {
    items: INode[];
    dim: Dimensions;
    dir: Direction;
    children?: React.ReactNode;
    title?: string;
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
        <Title>{title}</Title>
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

export function clickMain() {
  ipcRenderer.send('click-main');
  ipcRenderer.send('mixpanel-track', 'go to home from navigator border click');
}

const TabsParent = styled.div`
  z-index: 1;
  border-radius: 10px 10px 0 0;
  //display: flex;
  background-color: #d9dde2;
  width: 500px;
  //height: 34px;
  position: absolute;
  top: 0;
  left: 0;
  height: 70px;
  border-bottom: 1px solid #dee1e6;
  //border-bottom: 1px solid black;
`;

const TabsBarParent = styled.div`
  z-index: 1;
  border-radius: 10px 10px 0 0;
  display: flex;
  background-color: #d9dde2;
  width: 100%;
  height: 34px;
  //position: absolute;
  //top: 0;
  //left: 0;
`;

const TabParent = styled.div`
  padding: 0 0 0 13px;
  height: 35px;
  flex-grow: 1;
  display: flex;
  flex-wrap: wrap;
  align-content: center;
  max-width: calc(240px - 13px);
  //margin: 0 0 -1px 0;
  border-radius: 10px 10px 0 0;

  background-color: transparent;

  //transition-property: filter, background, color, opacity;
  transition-duration: 0.1s;

  :hover {
    background-color: #eff1f3;
    #tab-inner {
      border-right: 1px solid transparent;
    }
  }

  &.is-active {
    background-color: white;
    :hover {
      background-color: white;
    }
    #tab-inner {
      border-right: 1px solid transparent;
    }
  }

  &:not(:first-child) {
    margin: 0 0 0 -1px;
  }
`;

export const TabButton = styled.div`
  border-radius: 1000px;
  width: 16px;
  height: 16px;
  // color: ${color('body-text-color', 'opacity-high')};

  color: ${color('body-text-color')};
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-content: center;
  svg {
    font-size: 14px;
  }

  :hover {
    background-color: ${color('body-text-color', 'opacity-lower')};
  }

  :active,
  :hover:active,
  &.is-active {
    color: ${color('body-text-color')};
    background-color: ${color('body-text-color', 'opacity-lower')};
  }

  :active,
  :hover:active,
  :active.is-active {
    background-color: ${color('body-text-color', 'opacity-low')};
  }
`;

const Favicon = styled.div`
  height: 16px;
  width: 16px;
  background-color: gray;
  border-radius: 50%;
  margin: 0 6px 0 0;
`;

const TabInner = styled.div`
  width: calc(100%);
  padding: 0 8px 0 0;
  height: 19px;
  border-right: 1px solid #808387;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-content: center;
`;

interface ITabsBar {
  x: number;
  y: number;
  width: number;
}

interface ITab {
  active?: boolean;
  tab: TabPageTab;
}

const FavTitle = styled.div`
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-content: center;
  font-size: 12px;
  width: calc(100% - 16px);
`;

const Tab = observer(({ tab, active = false }: ITab) => {
  const tabRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/naming-convention,no-underscore-dangle
  let _active = active;
  const { tabPageStore, historyStore } = useStore();
  let title = 'New Tab';
  if (tab) {
    title = tab.title ? tab.title : 'New Tab';
  }

  if (!active) {
    _active = parseInt(historyStore.active, 10) === tab.id;
  }

  function handleAuxClick(e: MouseEvent) {
    if (e.button === 1) {
      tabPageStore.closeTab(tab.id, _active);
      ipcRenderer.send('mixpanel-track', 'middle click remove tab in bar');
    }
  }

  useEffect(() => {
    if (tabRef && tabRef.current) {
      tabRef.current.addEventListener('auxclick', handleAuxClick);
      const cap = tabRef.current;
      return () => {
        cap?.removeEventListener('auxclick', handleAuxClick);
      };
    }
    return () => {};
  });

  return (
    <TabParent
      ref={tabRef}
      className={_active ? 'is-active' : ''}
      onClick={() => {
        if (!_active) {
          ipcRenderer.send('set-tab', tab.id);
          ipcRenderer.send('mixpanel-track', 'click bar tab');
          // tabPageStore.setUrlText('');
        }
      }}
    >
      <TabInner id="tab-inner">
        <FavTitle>
          <Favicon />
          <div
            style={{
              height: '15px',
              margin: '-1px 0 0 0',
              width: 'calc(100% - 22px)',
              textOverflow: 'ellipsis',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              position: 'absolute',
              left: '22px',
            }}
          >
            {title}
          </div>
        </FavTitle>
        <TabButton
          onClick={(e) => {
            e.stopPropagation();
            tabPageStore.closeTab(tab.id, _active);
            ipcRenderer.send('mixpanel-track', 'click remove tab in bar');
          }}
        >
          <Close />
        </TabButton>
      </TabInner>
    </TabParent>
  );
});

const ButtonContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-content: center;
  margin: 0 8px 0 8px;
`;

const TabsBar = observer(({ x, y, width }: ITabsBar) => {
  const { tabPageStore } = useStore();
  return (
    <TabsParent style={{ top: y, left: x, width: `${width}px` }}>
      <TabsBarParent>
        {tabPageStore.tabPageRow().map((tab) => (
          <Tab key={tab.id} tab={tab} />
        ))}

        <ButtonContainer>
          <RoundButton
            onClick={() => {
              ipcRenderer.send('create-new-tab', true);
            }}
          >
            <Add />
          </RoundButton>
        </ButtonContainer>
      </TabsBarParent>
      <TitleBar />
    </TabsParent>
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
  const matches = nodeInWorkspaces(head, workspaceStore);
  const [x, y] = tabPageStore.navigatorTabModal;
  const tabModalInactive = x === 0 && y === 0;

  const tabsBarPos = {
    x: tabPageStore.innerBounds.x,
    y: tabPageStore.innerBounds.y - 34,
    width: tabPageStore.innerBounds.width,
  };
  return (
    <NavigatorParent
      ref={backRef}
      onClick={(e) => {
        if (backRef.current && e.target === backRef.current) {
          clickMain();
        }
      }}
    >
      <TabsBar x={tabsBarPos.x} y={tabsBarPos.y} width={tabsBarPos.width} />
      {!tabModalInactive ? <NavigatorTabModal /> : ''}
      <Panel
        dir={Direction.Back}
        items={[]}
        dim={{ width: tabWidth, height, margin }}
        title="Workspaces"
      >
        {matches.map((match) => (
          <WorkspaceItem key={match.itemId} data={match} />
        ))}
        {head ? <AddToWorkspace node={head} /> : ''}
      </Panel>
    </NavigatorParent>
  );
});

export default Navigator;
