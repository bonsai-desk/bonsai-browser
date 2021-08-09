import React, { useRef, useState } from 'react';
import styled from 'styled-components';
import { DraggableCore, DraggableData } from 'react-draggable';
import { observer } from 'mobx-react-lite';
import { Instance } from 'mobx-state-tree';
import workspaceStore, {
  ItemGroup,
  Item as MobxItem,
  itemSize,
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

function calculateItemOver(
  item: Instance<typeof MobxItem>,
  group: Instance<typeof ItemGroup>,
  offset: number[]
): Instance<typeof ItemGroup> | null {
  const centerPos = item.placeholderCenterPos(group.x, group.y);
  centerPos[0] += offset[0];
  centerPos[1] += offset[1];

  const overGroup = workspaceStore.getGroupAtPoint(centerPos);
  if (overGroup !== null && overGroup.id !== group.id) {
    workspaceStore.changeGroup(item, group, overGroup);
    workspaceStore.moveToFront(overGroup.id);
    return overGroup;
  }
  return null;
}

const MainItem = observer(
  ({
    group,
    item,
  }: {
    group: Instance<typeof ItemGroup>;
    item: Instance<typeof MobxItem>;
  }) => {
    const [offset, setOffset] = useState([0, 0]);

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
          }}
        />
        <DraggableCore
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
          onStart={() => {
            workspaceStore.moveToFront(group.id);
          }}
          onDrag={(_, data: DraggableData) => {
            setOffset([offset[0] + data.deltaX, offset[1] + data.deltaY]);
            const newGroup = calculateItemOver(item, group, offset);
            if (newGroup !== null) {
              const newPlacePos = item.placeholderRelativePos();
              newPlacePos[0] += newGroup.x;
              newPlacePos[1] += newGroup.y;
              setOffset([
                offset[0] - (newPlacePos[0] - placePos[0]),
                offset[1] - (newPlacePos[1] - placePos[1]),
              ]);
            }
          }}
          onStop={() => {
            setOffset([0, 0]);
          }}
        >
          <ItemContainer
            style={{
              width: itemSize,
              height: itemSize,
              left: placePos[0] + offset[0],
              top: placePos[1] + offset[1],
              zIndex:
                offset[0] === 0 && offset[1] === 0
                  ? group.zIndex
                  : Number.MAX_SAFE_INTEGER,
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
            workspaceStore.moveToFront(group.id);
          }}
          onDrag={(_, data: DraggableData) => {
            group.move(data.deltaX, data.deltaY);
          }}
          onStop={() => {
            workspaceStore.print();
          }}
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
    const group = workspaceStore.groups.get(item.groupId);
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
