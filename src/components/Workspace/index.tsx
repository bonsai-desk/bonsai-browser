import styled from 'styled-components';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useRef, useState } from 'react';
import { Instance } from 'mobx-state-tree';
import { DraggableCore } from 'react-draggable';
import { runInAction } from 'mobx';
import MainItem from './MainItem';
import MainGroup from './MainGroup';
import trashIcon from '../../../assets/alternate-trash.svg';
import hamburgerIcon from '../../../assets/hamburger-menu.svg';
import { ItemGroup } from '../../store/workspace/item-group';
import {
  InboxColumnWidth,
  Workspace as MobxWorkspace,
} from '../../store/workspace/workspace';
import { useStore, View } from '../../store/tab-page-store';
import { HeaderInput, HeaderText } from './style';
import ConfirmModal from '../Modal/Modal';

export { MainItem, MainGroup };

export const Background = styled.div`
  user-select: none;
  flex-grow: 1;
  display: flex;
`;
export const WorkspaceContentBackground = styled.div`
  user-select: none;
  flex-grow: 1;
  background-color: white;
  border-radius: 10px;
  position: relative;
  overflow: hidden;
`;
const InboxColumn = styled.div`
  background-color: #4287f5;
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  z-index: 9999999;
`;
export const TrashButton = styled.div`
  position: absolute;
  width: 100px;
  height: 100px;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000001;
`;
export const SideButton = styled.div`
  position: absolute;
  width: 100px;
  height: 100px;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000001;
  background-color: rgba(0, 0, 0, 0.7);

  :hover {
    background-color: rgba(50, 50, 50, 0.7);
  }
`;
export const CornerButtonIcon = styled.img`
  width: 75px;
  margin-bottom: 5px;

  -webkit-user-select: none;
  -moz-user-select: none;
  user-select: none;
  -webkit-user-drag: none;
`;
const HamburgerBackground = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 1000002;
`;
const HamburgerMenu = styled.div`
  position: absolute;
  top: 0;
  right: 100px;
  width: 300px;
  background-color: red;
  z-index: 10000003;
`;
const HamburgerOption = styled.div`
  background-color: lightblue;
  height: 50px;

  :hover {
    filter: brightness(0.8);
  }
`;

const Workspace = observer(
  ({ workspace }: { workspace: Instance<typeof MobxWorkspace> }) => {
    const { workspaceStore, tabPageStore } = useStore();
    const backgroundRef = useRef<HTMLDivElement>(null);

    const workspaceNameRef = useRef<HTMLInputElement>(null);

    const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);

    const groups = Array.from(workspace.groups.values()).map(
      (group: Instance<typeof ItemGroup>) => {
        return <MainGroup key={group.id} workspace={workspace} group={group} />;
      }
    );

    const items = Array.from(workspace.items.values()).map((item) => {
      let group;
      if (item.groupId === 'hidden') {
        group = workspace.hiddenGroup;
      } else if (item.groupId === 'inbox') {
        group = workspace.inboxGroup;
      } else {
        group = workspace.groups.get(item.groupId);
      }
      if (typeof group === 'undefined') {
        throw new Error(`could not find group with id ${item.groupId}`);
      }
      return (
        <MainItem
          key={item.id}
          workspace={workspace}
          item={item}
          group={group}
        />
      );
    });

    const [hasRunOnce, setHasRunOnce] = useState(false);
    useEffect(() => {
      if (hasRunOnce) {
        return;
      }
      setHasRunOnce(true);
      if (backgroundRef.current !== null) {
        const rect = backgroundRef.current.getBoundingClientRect();
        workspaceStore.workspaces.forEach((w) => {
          w.setRect(rect.x, rect.y, rect.width, rect.height);
        });
      }
      window.addEventListener(
        'resize',
        () => {
          if (backgroundRef.current !== null) {
            const rect = backgroundRef.current.getBoundingClientRect();
            workspaceStore.workspaces.forEach((w) => {
              w.setRect(rect.x, rect.y, rect.width, rect.height);
            });
          }
        },
        false
      );
    }, [hasRunOnce, workspace, workspaceStore.workspaces]);

    useEffect(() => {
      if (workspace.shouldEditName) {
        workspace.setShouldEditName(false);
        runInAction(() => {
          tabPageStore.activeWorkspaceNameRef = workspaceNameRef;
        });
        if (workspaceNameRef.current !== null) {
          workspaceNameRef.current.value = workspace.name;
        }
        setTimeout(() => {
          workspaceNameRef.current?.select();
        }, 10);
      }
    }, [tabPageStore, workspace]);

    return (
      <Background>
        <DraggableCore
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
          onDrag={(_, data) => {
            const [worldLastX, worldLastY] = workspace.screenToWorld(
              data.lastX,
              data.lastY
            );
            const [worldX, worldY] = workspace.screenToWorld(data.x, data.y);
            const deltaX = worldX - worldLastX;
            const deltaY = worldY - worldLastY;
            workspace.moveCamera(-deltaX, -deltaY);
          }}
        >
          <WorkspaceContentBackground
            ref={backgroundRef}
            onWheel={(e) => {
              const offsetX = e.pageX - workspace.x;
              const offsetY = e.pageY - workspace.y;

              if (offsetX < InboxColumnWidth) {
                workspace.setInboxScrollY(workspace.inboxScrollY + e.deltaY);
              } else {
                const lastMouseWorldPos = workspace.screenToWorld(
                  offsetX,
                  offsetY
                );

                workspace.setCameraZoom(
                  workspace.cameraZoom +
                    workspace.cameraZoom * (-e.deltaY / 1000) * 2
                );

                const mouseWorldPos = workspace.screenToWorld(offsetX, offsetY);
                const mouseWorldDeltaX =
                  lastMouseWorldPos[0] - mouseWorldPos[0];
                const mouseWorldDeltaY =
                  lastMouseWorldPos[1] - mouseWorldPos[1];

                workspace.moveCamera(mouseWorldDeltaX, mouseWorldDeltaY);
              }
            }}
          >
            <InboxColumn
              style={{ width: InboxColumnWidth }}
              onMouseDown={(e) => {
                e.stopPropagation();
              }}
            />
            <div>{groups}</div>
            <MainGroup workspace={workspace} group={workspace.inboxGroup} />
            <div>{items}</div>
            <TrashButton
              style={{
                left: workspace.width / 2 - 50,
                top: 0,
                borderRadius: '0 0 20px 20px',
                display: workspace.anyDragging ? 'flex' : 'none',
                backgroundColor: workspace.anyOverTrash
                  ? 'red'
                  : 'rgba(0, 0, 0, 0.7)',
              }}
            >
              <CornerButtonIcon src={trashIcon} />
            </TrashButton>
            <SideButton
              style={{
                right: 0,
                top: 0,
                borderRadius: '0 0 0 20px',
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
              }}
              onClick={() => {
                workspace.setHamburgerOpen(!workspace.hamburgerOpen);
              }}
            >
              <CornerButtonIcon src={hamburgerIcon} />
            </SideButton>
            <HamburgerBackground
              style={{
                display: workspace.hamburgerOpen ? 'block' : 'none',
              }}
              onMouseDown={() => {
                workspace.setHamburgerOpen(false);
              }}
            />
            <HamburgerMenu
              style={{
                display: workspace.hamburgerOpen ? 'block' : 'none',
              }}
            >
              <HamburgerOption
                onClick={() => {
                  workspace.centerCamera();
                  workspace.setHamburgerOpen(false);
                }}
              >
                Center Camera
              </HamburgerOption>
              <HamburgerOption
                onClick={() => {
                  setDeleteConfirmVisible(true);
                }}
              >
                Delete Workspace
              </HamburgerOption>
              <ConfirmModal
                title="Delete Workspace?"
                confirm={() => {
                  workspace.setHamburgerOpen(false);
                  runInAction(() => {
                    tabPageStore.View = View.Tabs;
                  });
                  workspaceStore.deleteWorkspace(workspace);
                }}
                visible={deleteConfirmVisible}
                setVisible={setDeleteConfirmVisible}
              />
            </HamburgerMenu>
            <HeaderText
              style={{
                display:
                  tabPageStore.activeWorkspaceNameRef === null
                    ? 'block'
                    : 'none',
                color: 'rgb(50, 50, 50)',
                left: InboxColumnWidth,
                cursor: 'pointer',
                width: 'auto',
                paddingRight: '12px',
                fontSize: '50px',
                zIndex: 10000000,
                backgroundColor: 'white',
                borderRadius: '0 1000000px 1000000px 0',
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
              }}
              onClick={() => {
                runInAction(() => {
                  tabPageStore.activeWorkspaceNameRef = workspaceNameRef;
                });
                if (workspaceNameRef.current !== null) {
                  workspaceNameRef.current.value = workspace.name;
                }
                setTimeout(() => {
                  workspaceNameRef.current?.select();
                }, 10);
              }}
            >
              {workspace.name}
            </HeaderText>
            <HeaderInput
              ref={workspaceNameRef}
              type="text"
              spellCheck="false"
              style={{
                display:
                  tabPageStore.activeWorkspaceNameRef === null
                    ? 'none'
                    : 'block',
                width: workspace.width - InboxColumnWidth,
                color: 'rgb(50, 50, 50)',
                left: InboxColumnWidth,
                top: 3,
                fontSize: '50px',
                zIndex: 10000000,
              }}
              onMouseDown={(e) => {
                if (e.button !== 1) {
                  e.stopPropagation();
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.stopPropagation();
                  e.preventDefault();
                  if (workspaceNameRef.current !== null) {
                    workspaceNameRef.current.blur();
                  }
                }
              }}
              onBlur={(e) => {
                runInAction(() => {
                  tabPageStore.activeWorkspaceNameRef = null;
                });
                if (e.currentTarget.value !== '') {
                  workspace.setName(e.currentTarget.value);
                }
              }}
            />
          </WorkspaceContentBackground>
        </DraggableCore>
      </Background>
    );
  }
);
export default Workspace;
