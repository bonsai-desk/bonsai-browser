import { observer } from 'mobx-react-lite';
import { Instance } from 'mobx-state-tree';
import React from 'react';
import { DraggableCore, DraggableData } from 'react-draggable';
import { runInAction } from 'mobx';
import { ipcRenderer } from 'electron';
import path from 'path';
import { useStore } from '../../store/tab-page-store';
import { easeOut, getGroupBelowItem, overTrash } from './utils';
import { lerp } from '../../utils/utils';
import {
  ItemContainer,
  ItemFavicon,
  ItemFaviconParent,
  ItemImg,
  ItemShade,
  ItemTitle,
} from './style';
import {
  Item as MobxItem,
  itemHeight,
  itemWidth,
} from '../../store/workspace/item';
import {
  groupBorder,
  groupPadding,
  groupTitleHeight,
  ItemGroup,
} from '../../store/workspace/item-group';
import { Workspace } from '../../store/workspace/workspace';
import { View } from '../../constants';

const MainItem = observer(
  ({
    workspace,
    group,
    item,
  }: {
    workspace: Instance<typeof Workspace>;
    group: Instance<typeof ItemGroup>;
    item: Instance<typeof MobxItem>;
  }) => {
    const { tabPageStore, workspaceStore } = useStore();
    const targetPos = workspace.placeholderPos(item, group);
    const [groupX, groupY] = workspace.worldToScreen(group.x, group.y);
    targetPos[0] += groupX;
    targetPos[1] += groupY;
    const lerpValue = easeOut(item.animationLerp);

    let zIndex;
    if (item.beingDragged) {
      zIndex = 10000000;
    } else if (item.groupId === 'inbox') {
      zIndex = 10000000 - 1;
    } else {
      zIndex = group.zIndex;
    }

    const [worldContainerDragPosX, worldContainerDragPosY] =
      workspace.worldToScreen(item.containerDragPosX, item.containerDragPosY);

    const imgFileUrl = path.join(
      workspaceStore.dataPath,
      'images',
      `${item.image}.jpg`
    );

    return (
      <DraggableCore
        onMouseDown={(e) => {
          if (e.button !== 1) {
            e.stopPropagation();
          }
        }}
        onStart={(_, data: DraggableData) => {
          item.setDragMouseStart(data.x, data.y);
          workspace.moveToFront(group);
          group.setHovering(false);
        }}
        onDrag={(_, data: DraggableData) => {
          if (!item.beingDragged) {
            const xDif = data.x - item.dragMouseStartX;
            const yDif = data.y - item.dragMouseStartY;
            const distSquared = xDif * xDif + yDif * yDif;
            if (distSquared > 5 * 5) {
              item.setBeingDragged(true);
              workspace.setAnyDragging(true);
              item.setDragStartGroup(group.id);
              const worldTargetPos = workspace.screenToWorld(
                targetPos[0],
                targetPos[1]
              );
              item.setContainerDragPos([worldTargetPos[0], worldTargetPos[1]]);
            }
          }

          if (item.beingDragged) {
            if (item.groupId !== 'inbox') {
              const worldDelta = workspace.screenVectorToWorldVector(
                data.deltaX,
                data.deltaY
              );
              item.setContainerDragPos([
                item.containerDragPosX + worldDelta[0],
                item.containerDragPosY + worldDelta[1],
              ]);
            }

            const [containerDragPosX, containerDragPosY] =
              workspace.worldToScreen(
                item.containerDragPosX,
                item.containerDragPosY
              );

            item.setOverTrash(overTrash([data.x, data.y], workspace));
            workspace.setAnyOverTrash(item.overTrash);
            if (item.overTrash) {
              if (group.id !== 'hidden') {
                workspace.changeGroup(item, group, workspace.hiddenGroup);
                if (group.id === 'inbox') {
                  const worldPos = workspace.screenToWorld(
                    data.x - (itemWidth / 2) * workspace.scale,
                    data.y - (itemHeight / 2) * workspace.scale
                  );
                  item.setContainerDragPos([worldPos[0], worldPos[1]]);
                }
              }
            } else {
              getGroupBelowItem(
                item,
                group,
                [containerDragPosX, containerDragPosY],
                [data.x, data.y],
                workspace
              );
            }

            if (item.groupId === 'inbox') {
              const worldPos = workspace.screenToWorld(
                data.x - (itemWidth / 2) * workspace.inboxScale,
                data.y - (itemHeight / 2) * workspace.inboxScale
              );
              item.setContainerDragPos([worldPos[0], worldPos[1]]);
            }
          }
        }}
        onStop={(_, data) => {
          let newGroup = group;
          if (!item.beingDragged) {
            runInAction(() => {
              tabPageStore.View = View.Tabs;
            });
            ipcRenderer.send('open-workspace-url', item.url);
            ipcRenderer.send('mixpanel-track', 'click workspace tab');
          } else {
            if (!item.overTrash) {
              const [containerDragPosX, containerDragPosY] =
                workspace.worldToScreen(
                  item.containerDragPosX,
                  item.containerDragPosY
                );

              const groupBelow = getGroupBelowItem(
                item,
                group,
                [containerDragPosX, containerDragPosY],
                [data.x, data.y],
                workspace
              );
              if (groupBelow === null) {
                const createdGroup = workspace.createGroup('New Group');
                newGroup = createdGroup;
                const [worldX, worldY] = workspace.screenToWorld(
                  containerDragPosX -
                    (groupPadding + groupBorder) * workspace.scale,
                  containerDragPosY -
                    (groupPadding + groupTitleHeight + groupBorder) *
                      workspace.scale
                );
                createdGroup.move(worldX, worldY);
                workspace.changeGroup(item, group, createdGroup);
                createdGroup.setShouldEditTitle(true);
                ipcRenderer.send(
                  'mixpanel-track',
                  'create workspace group by stop drag'
                );
              }
            }

            const worldTargetPos = workspace.screenToWorld(
              targetPos[0],
              targetPos[1]
            );
            item.setContainerDragPos([worldTargetPos[0], worldTargetPos[1]]);

            if (item.dragStartGroup !== '') {
              const startGroup = workspace.groups.get(item.dragStartGroup);
              if (
                typeof startGroup !== 'undefined' &&
                startGroup.itemArrangement.length === 0
              ) {
                workspace.deleteGroup(startGroup, workspaceStore.dataPath);
              }
            }
            item.setDragStartGroup('');
            item.setBeingDragged(false);

            if (item.overTrash) {
              workspace.deleteItem(item, group, workspaceStore.dataPath);
              ipcRenderer.send(
                'mixpanel-track',
                'delete workspace item with trash'
              );
            }
          }
          workspace.setAnyDragging(false);
          workspace.setAnyOverTrash(false);
          newGroup.setHovering(true);
        }}
      >
        <div
          style={{
            position: 'absolute',
            width: itemWidth,
            height: itemHeight,
            left: item.beingDragged
              ? worldContainerDragPosX
              : lerp(item.animationStartX + groupX, targetPos[0], lerpValue),
            top: item.beingDragged
              ? worldContainerDragPosY
              : lerp(item.animationStartY + groupY, targetPos[1], lerpValue),
            zIndex,
            transformOrigin: '0px 0px',
            transform: `scale(${
              group.id === 'inbox' ? workspace.inboxScale : workspace.scale
            })`,
          }}
        >
          <ItemContainer
            // showTitle={
            //   group.hovering &&
            //   !workspace.anyDragging &&
            //   !group.resizing &&
            //   tabPageStore.editingGroupId !== group.id
            // }
            showTitle
            style={{
              width: itemWidth,
              height: itemHeight,
              transform: item.beingDragged ? `rotate(5deg` : `none`,
              cursor: item.beingDragged ? 'grabbing' : 'default',
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
            <ItemShade />
            <ItemImg src={`file://${imgFileUrl}`} />
            {item.favicon ? (
              <ItemFaviconParent>
                <ItemFavicon img={`url(${item.favicon})`} />
              </ItemFaviconParent>
            ) : (
              ''
            )}
            <ItemTitle>{item.title}</ItemTitle>
          </ItemContainer>
        </div>
      </DraggableCore>
    );
  }
);

export default MainItem;
