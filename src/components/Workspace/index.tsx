import React, { useRef, useState } from 'react';
import styled from 'styled-components';
import { DraggableCore, DraggableData } from 'react-draggable';
import { observer } from 'mobx-react-lite';
import { Instance } from 'mobx-state-tree';
import workspaceStore, {
  ItemGroup,
  Item as MobxItem,
  itemSize,
  groupPadding,
  groupTitleHeight,
} from '../../store/workspace-store';

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
`;

const ItemContent = styled.div`
  width: calc(100% - 10px);
  height: calc(100% - 10px);
  margin: 5px;
`;

const Groups = styled.div``;
const Items = styled.div``;

function getGroupBelowItem(
  item: Instance<typeof MobxItem>,
  group: Instance<typeof ItemGroup>,
  containerPos: number[]
): Instance<typeof ItemGroup> | null {
  const overGroup = workspaceStore.getGroupAtPoint([
    containerPos[0] + itemSize / 2,
    containerPos[1] + itemSize / 2,
  ]);
  if (overGroup === null) {
    workspaceStore.changeGroup(item, group, workspaceStore.hiddenGroup);
  }
  if (overGroup !== null && overGroup.id !== group.id) {
    workspaceStore.changeGroup(item, group, overGroup);
    workspaceStore.moveToFront(overGroup);
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
    const [containerPos, setContainerPos] = useState([0, 0]);
    const [beingDragged, setBeingDragged] = useState(false);

    const placePos = item.placeholderRelativePos();
    placePos[0] += group.x;
    placePos[1] += group.y;

    return (
      <ItemPlaceholderAndContainer>
        <ItemPlaceholder
          style={{
            width: itemSize,
            height: itemSize,
            left: placePos[0],
            top: placePos[1],
            zIndex: group.zIndex,
            display: group.id === 'hidden' ? 'none' : 'block',
          }}
        />
        <DraggableCore
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
          onStart={() => {
            setBeingDragged(true);
            setContainerPos(placePos);
            workspaceStore.moveToFront(group);
          }}
          onDrag={(_, data: DraggableData) => {
            setContainerPos([
              containerPos[0] + data.deltaX,
              containerPos[1] + data.deltaY,
            ]);
            getGroupBelowItem(item, group, containerPos);
          }}
          onStop={() => {
            setBeingDragged(false);
            const groupBelow = getGroupBelowItem(item, group, containerPos);
            if (groupBelow === null) {
              const createdGroup = workspaceStore.createGroup('new group');
              createdGroup.move(
                containerPos[0] - groupPadding,
                containerPos[1] - (groupPadding + groupTitleHeight)
              );
              workspaceStore.changeGroup(item, group, createdGroup);
            }
            setContainerPos(placePos);
          }}
        >
          <ItemContainer
            style={{
              width: itemSize,
              height: itemSize,
              left: beingDragged ? containerPos[0] : placePos[0],
              top: beingDragged ? containerPos[1] : placePos[1],
              zIndex: beingDragged ? Number.MAX_SAFE_INTEGER : group.zIndex,
            }}
          >
            <ItemContent>{item.url}</ItemContent>
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
      const groupSize = group.size();
      return (
        <DraggableCore
          key={group.id}
          onStart={() => {
            workspaceStore.moveToFront(group);
          }}
          onDrag={(_, data: DraggableData) => {
            group.move(data.deltaX, data.deltaY);
          }}
          // onStop={() => {
          //   workspaceStore.print();
          // }}
        >
          <Group
            style={{
              width: groupSize[0],
              height: groupSize[1],
              left: group.x,
              top: group.y,
              zIndex: group.zIndex,
            }}
          >
            <div
              style={{
                paddingLeft: 10,
              }}
            >
              {group.title}
            </div>
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
      throw new Error('group is undefined');
    }
    return <MainItem key={item.id} item={item} group={group} />;
  });

  return (
    <Background ref={backgroundRef}>
      <Groups>{groups}</Groups>
      <Items>{items}</Items>
    </Background>
  );
});

export default Workspace;
