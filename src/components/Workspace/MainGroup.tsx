import { observer } from 'mobx-react-lite';
import { Instance, isValidReference } from 'mobx-state-tree';
import React, { useEffect, useRef } from 'react';
import { runInAction } from 'mobx';
import { DraggableCore, DraggableData } from 'react-draggable';
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
import RedX from '../RedX';
import redX from '../../../assets/x-letter.svg';
import {
  groupBorder,
  groupPadding,
  groupTitleHeight,
  ItemGroup,
  widthPixelsToInt,
} from '../../store/workspace/item-group';

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

    const groupHeight = lerp(
      group.animationStartHeight,
      targetGroupSize[1],
      lerpValue
    );

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

              const worldDelta = workspaceStore.screenVectorToWorldVector(
                data.deltaX,
                data.deltaY
              );
              group.move(worldDelta[0], worldDelta[1]);
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
            transform: `scale(${
              group.id === 'inbox'
                ? workspaceStore.inboxScale
                : workspaceStore.scale
            })`,
            width: lerp(
              group.animationStartWidth,
              targetGroupSize[0],
              lerpValue
            ),
            height:
              group.id === 'inbox'
                ? Math.max(groupHeight, workspaceStore.height)
                : groupHeight,
            left: groupScreenX,
            top: groupScreenY,
            zIndex: group.id === 'inbox' ? 10000000 - 1 : group.zIndex,
            border:
              group.id === 'inbox'
                ? `${groupBorder}px solid transparent`
                : `${groupBorder}px solid black`,
            display: group.id === 'hidden' ? 'none' : 'block',
            cursor: group.beingDragged ? 'grabbing' : 'auto',
            backgroundColor:
              group.id === 'inbox' ? 'transparent' : 'rgb(255, 170, 166)',
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
              cursor: (() => {
                if (group.id === 'inbox') {
                  return 'auto';
                }
                return group.beingDragged ? 'grabbing' : 'pointer';
              })(),
            }}
          >
            <HeaderText
              style={{
                display:
                  tabPageStore.editingGroupId === group.id ? 'none' : 'block',
              }}
            >
              {group.id === 'inbox' ? 'Unsorted' : group.title}
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
            <RedX
              style={{
                display: group.id === 'inbox' ? 'flex' : 'none',
                right: 10,
                top: 13,
              }}
              hoverColor="rgba(255, 0, 0, 1)"
              onClick={(e) => {
                e.stopPropagation();

                workspaceStore.inboxGroup.itemArrangement.forEach((itemId) => {
                  const item = workspaceStore.items.get(itemId);
                  if (typeof item !== 'undefined') {
                    workspaceStore.deleteItem(item, workspaceStore.inboxGroup);
                  }
                });
              }}
            >
              <img draggable={false} src={redX} alt="x" width="20px" />
            </RedX>
          </GroupHeader>
          <GroupResize
            style={{
              display: group.id === 'inbox' ? 'none' : 'block',
            }}
          />
        </Group>
      </DraggableCore>
    );
  }
);

export default MainGroup;
