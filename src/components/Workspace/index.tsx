import React, { useRef } from 'react';
import { ipcRenderer } from 'electron';
import styled, { css } from 'styled-components';
import { DraggableCore, DraggableData } from 'react-draggable';
import { observer } from 'mobx-react-lite';
import { Instance } from 'mobx-state-tree';
import BezierEasing from 'bezier-easing';
import workspaceStore, {
  ItemGroup,
  Item as MobxItem,
  itemWidth,
  itemHeight,
  groupPadding,
  groupTitleHeight,
} from '../../store/workspace-store';
import { lerp } from '../../utils/utils';
import trashIcon from '../../../assets/alternate-trash.svg';

const easeOut = BezierEasing(0, 0, 0.5, 1);

const Background = styled.div`
  user-select: none;
  flex-grow: 1;
  background-color: white;
  border-radius: 10px;
  position: relative;
  overflow: hidden;
`;

const Group = styled.div`
  background-color: rgb(255, 170, 166);
  border-radius: 20px;
  color: rgb(250, 250, 250);
  position: absolute;
  border: 2px solid black;
`;

const ItemPlaceholderAndContainer = styled.div``;

const ItemPlaceholder = styled.div`
  border-radius: 20px;
  background-color: rgba(100, 100, 100, 0.5);
  position: absolute;
  left: 0;
  top: 0;
`;

const ItemContainer = styled.div`
  background-color: rgb(255, 210, 181);
  border-radius: 20px;
  color: rgb(50, 50, 50);
  position: absolute;
  transition: transform 0.05s ease-out, filter 0.25s;
  overflow: hidden;
  opacity: 0;

  ${({ beingDragged }: { beingDragged: boolean }) =>
    css`
      ${beingDragged ? '' : 'div:hover { opacity: 100; }'}
    `};
`;

const ItemImg = styled.img`
  height: 100%;
  width: 100%;
  object-fit: cover;
  background-color: white;

  // :(
  -webkit-user-select: none;
  -moz-user-select: none;
  user-select: none;
  -webkit-user-drag: none;
`;

const ItemTitle = styled.div`
  background-color: rgba(0, 0, 0, 0.6);
  color: white;
  position: absolute;
  font-size: 0.9rem;
  width: calc(100% - 10px);
  height: calc(100% - 10px);
  padding: 5px;
  overflow: hidden;
  top: 0;
  left: 0;
  opacity: 0;
  transition: opacity 0.25s;
`;

const GroupHeader = styled.div`
  display: flex;
  align-items: center;
`;

const HeaderButtons = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-grow: 1;
  padding-right: 10px;
`;

const HeaderText = styled.div`
  padding-left: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const HeaderButton = styled.button`
  outline: none;
  border: none;
  border-radius: 50%;
  width: 30px;
  height: 30px;

  :hover {
    background-color: gray;
  }
`;

const Trash = styled.div`
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100px;
  height: 100px;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000000;
  border-radius: 0 20px 0 0;
`;

const TrashIcon = styled.img`
  width: 75px;
`;

const Groups = styled.div``;
const Items = styled.div``;

function overTrash(containerPos: number[]): boolean {
  const centerPos = [
    containerPos[0] + itemWidth / 2,
    containerPos[1] + itemHeight / 2,
  ];
  return (
    centerPos[0] >= 0 &&
    centerPos[0] <= 100 &&
    centerPos[1] >= workspaceStore.height - 100 &&
    centerPos[1] <= workspaceStore.height
  );
}

function getGroupBelowItem(
  item: Instance<typeof MobxItem>,
  currentGroup: Instance<typeof ItemGroup>,
  containerPos: number[]
): Instance<typeof ItemGroup> | null {
  const centerPos = [
    containerPos[0] + itemWidth / 2,
    containerPos[1] + itemHeight / 2,
  ];
  const overGroup = workspaceStore.getGroupAtPoint(centerPos);
  if (overGroup === null && currentGroup.id !== 'hidden') {
    workspaceStore.changeGroup(item, currentGroup, workspaceStore.hiddenGroup);
  }
  if (overGroup !== null) {
    if (overGroup.id !== currentGroup.id) {
      workspaceStore.changeGroup(item, currentGroup, overGroup);
      workspaceStore.moveToFront(overGroup);
    }
    workspaceStore.arrangeInGroup(item, centerPos, overGroup);
  }

  return overGroup;
}

const MainItem = observer(
  ({
    group,
    item,
  }: {
    group: Instance<typeof ItemGroup>;
    item: Instance<typeof MobxItem>;
  }) => {
    const targetPos = item.placeholderPos(group);
    const lerpValue = easeOut(item.animationLerp);
    const isOverTrash = overTrash([
      item.containerDragPosX,
      item.containerDragPosY,
    ]);

    return (
      <ItemPlaceholderAndContainer>
        <ItemPlaceholder
          style={{
            width: itemWidth,
            height: itemHeight,
            left: targetPos[0],
            top: targetPos[1],
            zIndex: group.zIndex,
            // display: item.beingDragged ? 'block' : 'none',
            display: 'none',
          }}
        />
        <DraggableCore
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
          onStart={(_, data: DraggableData) => {
            item.setDragMouseStart(data.x, data.y);
            workspaceStore.moveToFront(group);
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
              workspaceStore.setAnyOverTrash(isOverTrash);
              if (isOverTrash) {
                if (group.id !== 'hidden') {
                  workspaceStore.changeGroup(
                    item,
                    group,
                    workspaceStore.hiddenGroup
                  );
                }
              } else {
                getGroupBelowItem(item, group, [
                  item.containerDragPosX,
                  item.containerDragPosY,
                ]);
              }
            }
          }}
          onStop={() => {
            if (!item.beingDragged) {
              ipcRenderer.send('open-workspace-url', item.url);
            } else {
              if (!isOverTrash) {
                const groupBelow = getGroupBelowItem(item, group, [
                  item.containerDragPosX,
                  item.containerDragPosY,
                ]);
                if (groupBelow === null) {
                  const createdGroup = workspaceStore.createGroup('new group');
                  createdGroup.move(
                    item.containerDragPosX - groupPadding,
                    item.containerDragPosY - (groupPadding + groupTitleHeight)
                  );
                  workspaceStore.changeGroup(item, group, createdGroup);
                }
              }

              item.setContainerDragPos(targetPos);

              if (item.dragStartGroup !== '') {
                const startGroup = workspaceStore.groups.get(
                  item.dragStartGroup
                );
                if (
                  typeof startGroup !== 'undefined' &&
                  startGroup.itemArrangement.length === 0
                ) {
                  workspaceStore.deleteGroup(startGroup.id);
                }
              }
              item.setDragStartGroup('');
              item.setBeingDragged(false);

              if (isOverTrash) {
                workspaceStore.deleteItem(item, group);
              }
            }
            workspaceStore.setAnyDragging(false);
            workspaceStore.setAnyOverTrash(false);
          }}
        >
          <ItemContainer
            beingDragged={item.beingDragged}
            style={{
              width: itemWidth,
              height: itemHeight,
              left: item.beingDragged
                ? item.containerDragPosX
                : lerp(item.animationStartX, targetPos[0], lerpValue),
              top: item.beingDragged
                ? item.containerDragPosY
                : lerp(item.animationStartY, targetPos[1], lerpValue),
              zIndex: item.beingDragged
                ? Number.MAX_SAFE_INTEGER
                : group.zIndex,
              transform: item.beingDragged ? 'rotate(5deg)' : 'none',
              cursor: item.beingDragged ? 'grabbing' : 'default',
              opacity: isOverTrash ? 0.5 : 1,
              boxShadow: item.beingDragged
                ? '0 0 5px 0 rgba(100, 100, 100, 0.5)'
                : 'none',
            }}
          >
            <ItemImg src={item.image} alt="tab_image" />
            <ItemTitle>{item.title}</ItemTitle>
          </ItemContainer>
        </DraggableCore>
      </ItemPlaceholderAndContainer>
    );
  }
);

const Workspace = observer(() => {
  const backgroundRef = useRef<HTMLDivElement>(null);

  const groups = Array.from(workspaceStore.groups.values()).map(
    (group: Instance<typeof ItemGroup>) => {
      const targetGroupSize = group.size();
      const lerpValue = easeOut(group.animationLerp);

      return (
        <DraggableCore
          key={group.id}
          onStart={() => {
            workspaceStore.moveToFront(group);
          }}
          onDrag={(_, data: DraggableData) => {
            group.move(data.deltaX, data.deltaY);
          }}
        >
          <Group
            style={{
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
              left: group.x,
              top: group.y,
              zIndex: group.zIndex,
              display: group.id === 'hidden' ? 'none' : 'block',
            }}
          >
            <GroupHeader
              style={{
                height: groupTitleHeight,
              }}
            >
              <HeaderText>{group.title}</HeaderText>
              <HeaderButtons>
                <HeaderButton
                  type="button"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    if (group.width > 1) {
                      workspaceStore.setGroupWidth(group.width - 1, group);
                    }
                  }}
                >
                  -
                </HeaderButton>
                <HeaderButton
                  type="button"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    if (group.width < 5) {
                      workspaceStore.setGroupWidth(group.width + 1, group);
                    }
                  }}
                >
                  +
                </HeaderButton>
              </HeaderButtons>
            </GroupHeader>
          </Group>
        </DraggableCore>
      );
    }
  );

  const items = Array.from(workspaceStore.items.values()).map((item) => {
    const group =
      item.groupId === 'hidden'
        ? workspaceStore.hiddenGroup
        : workspaceStore.groups.get(item.groupId);
    if (typeof group === 'undefined') {
      throw new Error(`could not find group with id ${item.groupId}`);
    }
    return <MainItem key={item.id} item={item} group={group} />;
  });

  if (backgroundRef.current !== null) {
    const rect = backgroundRef.current.getBoundingClientRect();
    workspaceStore.setSize(rect.width, rect.height);
  }

  return (
    <Background ref={backgroundRef}>
      <Groups>{groups}</Groups>
      <Items>{items}</Items>
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
  );
});

export default Workspace;
