import { observer } from 'mobx-react-lite';
import React, { useEffect, useRef, useState } from 'react';
import { Instance } from 'mobx-state-tree';
import { DraggableCore } from 'react-draggable';
import { useStore } from '../store/tab-page-store';
import { ItemGroup } from '../store/workspace-store';
import {
  Background,
  MainGroup,
  MainItem,
  Trash,
  TrashIcon,
} from '../components/Workspace';
import trashIcon from '../../assets/alternate-trash.svg';

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

  if (backgroundRef.current !== null) {
    const rect = backgroundRef.current.getBoundingClientRect();
    workspaceStore.setRect(rect.x, rect.y, rect.width, rect.height);
  }

  return (
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
      <Background
        ref={backgroundRef}
        onWheel={(e) => {
          console.log(e.deltaY);

          const offsetX = e.pageX - workspaceStore.x;
          const offsetY = e.pageY - workspaceStore.y;

          const lastMouseWorldPos = workspaceStore.screenToWorld(
            offsetX,
            offsetY
          );

          workspaceStore.setCameraZoom(
            workspaceStore.cameraZoom +
              workspaceStore.cameraZoom * (-e.deltaY / 1000) * 2
          );

          const mouseWorldPos = workspaceStore.screenToWorld(offsetX, offsetY);
          const mouseWorldDeltaX = lastMouseWorldPos[0] - mouseWorldPos[0];
          const mouseWorldDeltaY = lastMouseWorldPos[1] - mouseWorldPos[1];

          workspaceStore.moveCamera(mouseWorldDeltaX, mouseWorldDeltaY);
        }}
      >
        {/* <div style={{ transform: `scale(${workspaceStore.cameraZoom})` }}> */}
        <div>{groups}</div>
        <MainGroup group={workspaceStore.inboxGroup} />
        <div>{items}</div>
        {/* </div> */}
        <Trash
          style={{
            display: workspaceStore.anyDragging ? 'flex' : 'none',
            backgroundColor: workspaceStore.anyOverTrash
              ? 'red'
              : 'rgba(0, 0, 0, 0.7)',
          }}
        >
          <TrashIcon src={trashIcon} />
        </Trash>
      </Background>
    </DraggableCore>
  );
});
export default Workspace;
