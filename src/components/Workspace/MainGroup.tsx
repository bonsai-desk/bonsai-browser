import { observer } from 'mobx-react-lite';
import { Instance, isValidReference } from 'mobx-state-tree';
import React, { useEffect, useRef } from 'react';
import { runInAction } from 'mobx';
import { DraggableCore, DraggableData } from 'react-draggable';
import {
  groupBorder,
  groupPadding,
  groupTitleHeight,
  ItemGroup,
  widthPixelsToInt,
} from '../../store/workspace-store';
import { useStore } from '../../store/tab-page-store';
import { easeOut, overTrash } from './utils';
import { lerp } from '../../utils/utils';
import {
  Group,
  GroupHeader,
  GroupResize,
  HeaderInput,
  HeaderText,
} from './style';

const MainGroup = observer(
  ({ group }: { group: Instance<typeof ItemGroup> }) => {
    const { tabPageStore, workspaceStore } = useStore();

    const targetGroupSize = group.size();
    const lerpValue = easeOut(group.animationLerp);

    const groupTitleBoxRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      if (
        isValidReference(() => group) &&
        tabPageStore.editingGroupId === group.id
      ) {
        setTimeout(() => {
          groupTitleBoxRef.current?.select();
        }, 10);
      }
    }, [tabPageStore.editingGroupId, group]);

    useEffect(() => {
      if (group.shouldEditTitle) {
        group.setShouldEditTitle(false);
        runInAction(() => {
          tabPageStore.activeGroupBoxRef = groupTitleBoxRef;
          tabPageStore.editingGroupId = group.id;
        });
        if (groupTitleBoxRef.current !== null) {
          groupTitleBoxRef.current.value = group.title;
        }
      }
    }, [group, group.shouldEditTitle, tabPageStore]);

    const [groupScreenX, groupScreenY] = workspaceStore.worldToScreen(
      group.x,
      group.y
    );

    console.log('asdf');

    return (
      <DraggableCore
        onMouseDown={(e) => {
          e.stopPropagation();
        }}
        onStart={(_, data) => {
          if (group.id === 'inbox') {
            return;
          }

          workspaceStore.moveToFront(group);
          group.setDragMouseStart(data.x, data.y);

          const [screenGroupX, screenGroupY] = workspaceStore.worldToScreen(
            group.x,
            group.y
          );

          if (
            data.x >
            screenGroupX + (group.size()[0] - 10) * workspaceStore.scale
          ) {
            group.setTempResizeWidth(group.width);
            group.setResizing(true);
          } else if (
            data.y >=
            screenGroupY +
              (groupTitleHeight + groupPadding + groupBorder) *
                workspaceStore.scale
          ) {
            group.setBeingDragged(true);
            workspaceStore.setAnyDragging(true);
          }
        }}
        onDrag={(_, data: DraggableData) => {
          if (group.id === 'inbox') {
            return;
          }

          const screenGroupX = workspaceStore.worldToScreen(
            group.x,
            group.y
          )[0];

          if (group.resizing) {
            group.setTempResizeWidth(
              widthPixelsToInt((data.x - screenGroupX) / workspaceStore.scale)
            );
            workspaceStore.setGroupWidth(
              Math.floor(group.tempResizeWidth),
              group
            );
          } else {
            if (
              !group.beingDragged &&
              tabPageStore.editingGroupId !== group.id
            ) {
              const xDif = data.x - group.dragMouseStartX;
              const yDif = data.y - group.dragMouseStartY;
              const distSquared = xDif * xDif + yDif * yDif;
              if (distSquared > 5 * 5) {
                group.setBeingDragged(true);
                workspaceStore.setAnyDragging(true);
              }
            }

            if (group.beingDragged) {
              group.setOverTrash(overTrash([data.x, data.y], workspaceStore));
              workspaceStore.setAnyOverTrash(group.overTrash);

              const [worldLastX, worldLastY] = workspaceStore.screenToWorld(
                data.lastX,
                data.lastY
              );
              const [worldX, worldY] = workspaceStore.screenToWorld(
                data.x,
                data.y
              );
              const deltaX = worldX - worldLastX;
              const deltaY = worldY - worldLastY;
              group.move(deltaX, deltaY);
            }
          }
        }}
        onStop={(_, data) => {
          if (group.id === 'inbox') {
            return;
          }

          const screenGroupX = workspaceStore.worldToScreen(
            group.x,
            group.y
          )[0];

          if (
            !group.beingDragged &&
            !group.resizing &&
            tabPageStore.editingGroupId !== group.id
          ) {
            runInAction(() => {
              tabPageStore.activeGroupBoxRef = groupTitleBoxRef;
              tabPageStore.editingGroupId = group.id;
            });
            if (groupTitleBoxRef.current !== null) {
              groupTitleBoxRef.current.value = group.title;
            }
          }

          if (group.resizing) {
            const roundFunc = group.height() === 1 ? Math.round : Math.floor;
            group.setTempResizeWidth(
              widthPixelsToInt((data.x - screenGroupX) / workspaceStore.scale)
            );
            workspaceStore.setGroupWidth(
              roundFunc(group.tempResizeWidth),
              group,
              true
            );
            group.setResizing(false);
          }

          if (group.overTrash) {
            workspaceStore.deleteGroup(group);
            workspaceStore.setAnyDragging(false);
            workspaceStore.setAnyOverTrash(false);
            return;
          }

          group.setBeingDragged(false);
          group.setOverTrash(false);
          workspaceStore.setAnyDragging(false);
          workspaceStore.setAnyOverTrash(false);
        }}
      >
        <Group
          style={{
            transformOrigin: '0px 0px',
            transform: `scale(${workspaceStore.scale})`,
            width: lerp(
              group.animationStartWidth,
              targetGroupSize[0],
              lerpValue
            ),
            height: lerp(
              group.animationStartHeight,
              targetGroupSize[1],
              lerpValue
            ),
            left: groupScreenX,
            top: groupScreenY,
            zIndex: group.zIndex,
            border: `${groupBorder}px solid black`,
            display:
              group.id === 'hidden' ||
              (group.id === 'inbox' && group.itemArrangement.length === 0)
                ? 'none'
                : 'block',
            cursor: group.beingDragged ? 'grabbing' : 'auto',
            backgroundColor:
              group.id === 'inbox' ? '#4287f5' : 'rgb(255, 170, 166)',
          }}
          onMouseOver={() => {
            group.setHovering(true);
          }}
          onMouseLeave={() => {
            group.setHovering(false);
          }}
        >
          <GroupHeader
            style={{
              height: groupTitleHeight + groupPadding,
              cursor: group.beingDragged ? 'grabbing' : 'pointer',
            }}
          >
            <HeaderText
              style={{
                display:
                  tabPageStore.editingGroupId === group.id ? 'none' : 'block',
              }}
            >
              {group.title}
            </HeaderText>
            <HeaderInput
              ref={groupTitleBoxRef}
              type="text"
              spellCheck="false"
              style={{
                display:
                  tabPageStore.editingGroupId === group.id ? 'block' : 'none',
                height: groupTitleHeight + groupPadding,
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
                  if (groupTitleBoxRef.current !== null) {
                    groupTitleBoxRef.current.blur();
                  }
                }
              }}
              onBlur={(e) => {
                runInAction(() => {
                  tabPageStore.activeGroupBoxRef = null;
                  tabPageStore.editingGroupId = '';
                });
                if (e.currentTarget.value !== '') {
                  group.setTitle(e.currentTarget.value);
                }
              }}
            />
          </GroupHeader>
          <GroupResize />
        </Group>
      </DraggableCore>
    );
  }
);

export default MainGroup;
