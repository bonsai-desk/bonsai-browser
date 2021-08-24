import styled from 'styled-components';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useRef, useState } from 'react';
import { Instance } from 'mobx-state-tree';
import { DraggableCore } from 'react-draggable';
import MainItem from './MainItem';
import MainGroup from './MainGroup';
import { useStore } from '../../store/tab-page-store';
import { InboxColumnWidth, ItemGroup } from '../../store/workspace-store';
import trashIcon from '../../../assets/alternate-trash.svg';
import centerIcon from '../../../assets/center-square.svg';

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
const Workspace = observer(() => {
  const backgroundRef = useRef<HTMLDivElement>(null);
  const { workspaceStore } = useStore();

  const groups = Array.from(workspaceStore.groups.values()).map(
    (group: Instance<typeof ItemGroup>) => {
      return <MainGroup key={group.id} group={group} />;
    }
  );

  const items = Array.from(workspaceStore.items.values()).map((item) => {
    let group;
    if (item.groupId === 'hidden') {
      group = workspaceStore.hiddenGroup;
    } else if (item.groupId === 'inbox') {
      group = workspaceStore.inboxGroup;
    } else {
      group = workspaceStore.groups.get(item.groupId);
    }
    if (typeof group === 'undefined') {
      throw new Error(`could not find group with id ${item.groupId}`);
    }
    return <MainItem key={item.id} item={item} group={group} />;
  });

  const [hasRunOnce, setHasRunOnce] = useState(false);
  useEffect(() => {
    if (hasRunOnce) {
      return;
    }
    setHasRunOnce(true);
    if (backgroundRef.current !== null) {
      const rect = backgroundRef.current.getBoundingClientRect();
      workspaceStore.setRect(rect.x, rect.y, rect.width, rect.height);
    }
    window.addEventListener(
      'resize',
      () => {
        if (backgroundRef.current !== null) {
          const rect = backgroundRef.current.getBoundingClientRect();
          workspaceStore.setRect(rect.x, rect.y, rect.width, rect.height);
        }
      },
      false
    );
  }, [hasRunOnce, workspaceStore]);

  return (
    <Background>
      <DraggableCore
        onMouseDown={(e) => {
          e.stopPropagation();
        }}
        onDrag={(_, data) => {
          const [worldLastX, worldLastY] = workspaceStore.screenToWorld(
            data.lastX,
            data.lastY
          );
          const [worldX, worldY] = workspaceStore.screenToWorld(data.x, data.y);
          const deltaX = worldX - worldLastX;
          const deltaY = worldY - worldLastY;
          workspaceStore.moveCamera(-deltaX, -deltaY);
        }}
      >
        <WorkspaceContentBackground
          ref={backgroundRef}
          onWheel={(e) => {
            const offsetX = e.pageX - workspaceStore.x;
            const offsetY = e.pageY - workspaceStore.y;

            if (offsetX < InboxColumnWidth) {
              workspaceStore.setInboxScrollY(
                Math.max(workspaceStore.inboxScrollY + e.deltaY, 0)
              );
              console.log(workspaceStore.inboxScrollY);
            } else {
              const lastMouseWorldPos = workspaceStore.screenToWorld(
                offsetX,
                offsetY
              );

              workspaceStore.setCameraZoom(
                workspaceStore.cameraZoom +
                  workspaceStore.cameraZoom * (-e.deltaY / 1000) * 2
              );

              const mouseWorldPos = workspaceStore.screenToWorld(
                offsetX,
                offsetY
              );
              const mouseWorldDeltaX = lastMouseWorldPos[0] - mouseWorldPos[0];
              const mouseWorldDeltaY = lastMouseWorldPos[1] - mouseWorldPos[1];

              workspaceStore.moveCamera(mouseWorldDeltaX, mouseWorldDeltaY);
            }
          }}
        >
          <InboxColumn style={{ width: InboxColumnWidth }} />
          <div>{groups}</div>
          <MainGroup group={workspaceStore.inboxGroup} />
          <div>{items}</div>
          <CornerButton
            style={{
              left: InboxColumnWidth,
              bottom: 0,
              borderRadius: '0 20px 0 0',
              display: workspaceStore.anyDragging ? 'flex' : 'none',
              backgroundColor: workspaceStore.anyOverTrash
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
              workspaceStore.centerCamera();
            }}
          >
            <CornerButtonIcon src={centerIcon} />
          </CenterButton>
        </WorkspaceContentBackground>
      </DraggableCore>
    </Background>
  );
});
export default Workspace;
