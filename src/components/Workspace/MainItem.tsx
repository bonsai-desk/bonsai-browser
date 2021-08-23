import { observer } from 'mobx-react-lite';
import { Instance } from 'mobx-state-tree';
import React from 'react';
import { DraggableCore, DraggableData } from 'react-draggable';
import { runInAction } from 'mobx';
import { ipcRenderer } from 'electron';
import {
  groupBorder,
  groupPadding,
  groupTitleHeight,
  Item as MobxItem,
  ItemGroup,
  itemHeight,
  itemWidth,
} from '../../store/workspace-store';
import { useStore, View } from '../../store/tab-page-store';
import { easeOut, getGroupBelowItem, overTrash } from './utils';
import { lerp } from '../../utils/utils';
import { ItemContainer, ItemImg, ItemTitle } from './style';

const MainItem = observer(
  ({
    group,
    item,
  }: {
    group: Instance<typeof ItemGroup>;
    item: Instance<typeof MobxItem>;
  }) => {
    const { tabPageStore, workspaceStore } = useStore();
    const targetPos = item.placeholderPos(group, workspaceStore.scale);
    const [groupX, groupY] = workspaceStore.worldToScreen(group.x, group.y);
    targetPos[0] += groupX;
    targetPos[1] += groupY;
    const lerpValue = easeOut(item.animationLerp);

    let zIndex = 0;
    if (item.groupId === 'inbox') {
      zIndex = 10000000 - 1;
    } else if (item.beingDragged) {
      zIndex = 10000000;
    } else {
      zIndex = group.zIndex;
    }

    return (
      <DraggableCore
        onMouseDown={(e) => {
          if (e.button !== 1) {
            e.stopPropagation();
          }
        }}
        onStart={(_, data: DraggableData) => {
          item.setDragMouseStart(data.x, data.y);
          workspaceStore.moveToFront(group);
          group.setHovering(false);
        }}
        onDrag={(_, data: DraggableData) => {
          if (!item.beingDragged) {
            const xDif = data.x - item.dragMouseStartX;
            const yDif = data.y - item.dragMouseStartY;
            const distSquared = xDif * xDif + yDif * yDif;
            if (distSquared > 5 * 5) {
              item.setBeingDragged(true);
              workspaceStore.setAnyDragging(true);
              item.setDragStartGroup(group.id);
              item.setContainerDragPos(targetPos);
            }
          }

          if (item.beingDragged) {
            item.setContainerDragPos([
              item.containerDragPosX + data.deltaX,
              item.containerDragPosY + data.deltaY,
            ]);
            item.setOverTrash(overTrash([data.x, data.y], workspaceStore));
            workspaceStore.setAnyOverTrash(item.overTrash);
            if (item.overTrash) {
              if (group.id !== 'hidden') {
                workspaceStore.changeGroup(
                  item,
                  group,
                  workspaceStore.hiddenGroup
                );
              }
            } else {
              getGroupBelowItem(
                item,
                group,
                [item.containerDragPosX, item.containerDragPosY],
                workspaceStore
              );
            }
          }
        }}
        onStop={() => {
          let newGroup = group;
          if (!item.beingDragged) {
            runInAction(() => {
              tabPageStore.View = View.Tabs;
            });
            ipcRenderer.send('open-workspace-url', item.url);
          } else {
            if (!item.overTrash) {
              const groupBelow = getGroupBelowItem(
                item,
                group,
                [item.containerDragPosX, item.containerDragPosY],
                workspaceStore
              );
              if (groupBelow === null) {
                const createdGroup = workspaceStore.createGroup('New Group');
                newGroup = createdGroup;
                const [worldX, worldY] = workspaceStore.screenToWorld(
                  item.containerDragPosX -
                    (groupPadding + groupBorder) * workspaceStore.scale,
                  item.containerDragPosY -
                    (groupPadding + groupTitleHeight + groupBorder) *
                      workspaceStore.scale
                );
                createdGroup.move(worldX, worldY);
                workspaceStore.changeGroup(item, group, createdGroup);
                createdGroup.setShouldEditTitle(true);
              }
            }

            item.setContainerDragPos(targetPos);

            if (item.dragStartGroup !== '') {
              const startGroup = workspaceStore.groups.get(item.dragStartGroup);
              if (
                typeof startGroup !== 'undefined' &&
                startGroup.itemArrangement.length === 0
              ) {
                workspaceStore.deleteGroup(startGroup);
              }
            }
            item.setDragStartGroup('');
            item.setBeingDragged(false);

            if (item.overTrash) {
              workspaceStore.deleteItem(item, group);
            }
          }
          workspaceStore.setAnyDragging(false);
          workspaceStore.setAnyOverTrash(false);
          newGroup.setHovering(true);
        }}
      >
        <div
          style={{
            position: 'absolute',
            width: itemWidth,
            height: itemHeight,
            left: item.beingDragged
              ? item.containerDragPosX
              : lerp(item.animationStartX + groupX, targetPos[0], lerpValue),
            top: item.beingDragged
              ? item.containerDragPosY
              : lerp(item.animationStartY + groupY, targetPos[1], lerpValue),
            zIndex,
            transformOrigin: '0px 0px',
            transform: `scale(${
              group.id === 'inbox'
                ? workspaceStore.inboxScale
                : workspaceStore.scale
            })`,
          }}
        >
          <ItemContainer
            showTitle={
              group.hovering &&
              !workspaceStore.anyDragging &&
              !group.resizing &&
              tabPageStore.editingGroupId !== group.id
            }
            style={{
              width: itemWidth,
              height: itemHeight,
              transform: item.beingDragged ? `rotate(5deg` : `none`,
              cursor: item.beingDragged ? 'grabbing' : 'default',
              // opacity: item.overTrash ? 0.5 : 1,
              boxShadow: item.beingDragged
                ? '0 0 5px 0 rgba(100, 100, 100, 0.5)'
                : 'none',
            }}
            onMouseOver={() => {
              group.setHovering(true);
            }}
            onMouseLeave={() => {
              group.setHovering(false);
            }}
          >
            <ItemImg src={item.image} alt="tab_image" />
            <ItemTitle>{item.title}</ItemTitle>
          </ItemContainer>
        </div>
      </DraggableCore>
    );
  }
);

export default MainItem;
