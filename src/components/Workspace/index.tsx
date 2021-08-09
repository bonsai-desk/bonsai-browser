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

const MainItem = observer(
  ({
    group,
    item,
  }: {
    group: Instance<typeof ItemGroup>;
    item: Instance<typeof MobxItem>;
  }) => {
    const [offset, setOffset] = useState([0, 0]);
    const itemRef = useRef<HTMLDivElement>(null);

    const placePos = item.placeHolderRelativePos();

    return (
      <ItemPlaceholder
        style={{
          width: itemSize,
          height: itemSize,
          left: placePos[0],
          top: placePos[1],
        }}
      >
        <DraggableCore
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
          onStart={() => {
            workspaceStore.moveToFront(group.id);
          }}
          onDrag={(_, data: DraggableData) => {
            setOffset([offset[0] + data.deltaX, offset[1] + data.deltaY]);
          }}
          onStop={() => {
            if (itemRef.current !== null) {
              const centerPos = item.placeHolderCenterPos(group.x, group.y);
              centerPos[0] += offset[0];
              centerPos[1] += offset[1];

              const overGroup = workspaceStore.getGroupAtPoint(centerPos);
              if (overGroup !== null && overGroup.id !== group.id) {
                const removedItem = group.removeItem(item.id);
                if (removedItem !== null) {
                  overGroup.addItem(removedItem);
                  workspaceStore.moveToFront(overGroup.id);
                }
              }
            }
            setOffset([0, 0]);
          }}
        >
          <ItemContainer
            ref={itemRef}
            style={{
              width: itemSize,
              height: itemSize,
              left: offset[0],
              top: offset[1],
              zIndex:
                offset[0] === 0 && offset[1] === 0
                  ? 'auto'
                  : Number.MAX_SAFE_INTEGER,
            }}
          >
            <ItemContent>{item.url}</ItemContent>
          </ItemContainer>
        </DraggableCore>
      </ItemPlaceholder>
    );
  }
);

const Workspace = observer(() => {
  const backgroundRef = useRef<HTMLDivElement>(null);

  const content = Array.from(workspaceStore.groups.values()).map(
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
            <div>
              {Array.from(group.items.values()).map((item) => {
                return <MainItem key={item.id} item={item} group={group} />;
              })}
            </div>
          </Group>
        </DraggableCore>
      );
    }
  );
  return <Background ref={backgroundRef}>{content}</Background>;
});

export default Workspace;
