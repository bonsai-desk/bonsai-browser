import styled from 'styled-components';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useRef, useState } from 'react';
import { Instance } from 'mobx-state-tree';
import { DraggableCore } from 'react-draggable';
import MainItem from './MainItem';
import MainGroup from './MainGroup';
import trashIcon from '../../../assets/alternate-trash.svg';
import centerIcon from '../../../assets/center-square.svg';
import { ItemGroup } from '../../store/workspace/item-group';
import {
  InboxColumnWidth,
  Workspace as MobxWorkspace,
} from '../../store/workspace/workspace';

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
export const CornerButton = styled.div`
  position: absolute;
  width: 100px;
  height: 100px;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000001;
`;
export const CenterButton = styled.div`
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

  -webkit-user-select: none;
  -moz-user-select: none;
  user-select: none;
  -webkit-user-drag: none;
`;
const Workspace = observer(
  ({ workspace }: { workspace: Instance<typeof MobxWorkspace> }) => {
    const backgroundRef = useRef<HTMLDivElement>(null);

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
        workspace.setRect(rect.x, rect.y, rect.width, rect.height);
      }
      window.addEventListener(
        'resize',
        () => {
          if (backgroundRef.current !== null) {
            const rect = backgroundRef.current.getBoundingClientRect();
            workspace.setRect(rect.x, rect.y, rect.width, rect.height);
          }
        },
        false
      );
    }, [hasRunOnce, workspace]);

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
            <InboxColumn style={{ width: InboxColumnWidth }} />
            <div>{groups}</div>
            <MainGroup workspace={workspace} group={workspace.inboxGroup} />
            <div>{items}</div>
            <CornerButton
              style={{
                left: InboxColumnWidth,
                bottom: 0,
                borderRadius: '0 20px 0 0',
                display: workspace.anyDragging ? 'flex' : 'none',
                backgroundColor: workspace.anyOverTrash
                  ? 'red'
                  : 'rgba(0, 0, 0, 0.7)',
              }}
            >
              <CornerButtonIcon src={trashIcon} />
            </CornerButton>
            <CenterButton
              style={{
                right: 0,
                bottom: 0,
                borderRadius: '20px 0 0 0',
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
              }}
              onClick={() => {
                workspace.centerCamera();
              }}
            >
              <CornerButtonIcon src={centerIcon} />
            </CenterButton>
          </WorkspaceContentBackground>
        </DraggableCore>
      </Background>
    );
  }
);
export default Workspace;
