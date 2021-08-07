import React from 'react';
import styled from 'styled-components';
import { DraggableCore, DraggableData } from 'react-draggable';
import { observer } from 'mobx-react-lite';
import { Instance } from 'mobx-state-tree';
import workspaceStore, { ItemGroup } from '../../store/workspace-store';

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
  margin: 5px;
  padding: 5px;
  color: rgb(250, 250, 250);
  position: absolute;
  border: 2px solid black;
`;

const ItemPlaceholder = styled.div`
  width: 110px;
  height: 110px;
  border-radius: 20px;
  background-color: gray;
  margin: 5px;
  position: relative;
`;

const Item = styled.div`
  width: 100px;
  height: 100px;
  background-color: rgb(255, 210, 181);
  border-radius: 20px;
  padding: 5px;
  color: rgb(50, 50, 50);
  position: absolute;
`;

const Workspace = observer(() => {
  const content = workspaceStore.groups.map(
    (group: Instance<typeof ItemGroup>) => {
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
              left: group.x,
              top: group.y,
              zIndex: group.zIndex,
            }}
          >
            <div>{group.title}</div>
            <div>
              {group.items.map((item) => {
                return (
                  <ItemPlaceholder key={item.id}>
                    <DraggableCore
                      onMouseDown={(e) => {
                        e.stopPropagation();
                      }}
                      onStart={() => {
                        workspaceStore.moveToFront(group.id);
                      }}
                      onDrag={(_, data: DraggableData) => {
                        item.move(data.deltaX, data.deltaY);
                      }}
                      onStop={() => {
                        item.reset();
                      }}
                    >
                      <Item
                        style={{
                          left: item.x,
                          top: item.y,
                          zIndex:
                            item.x === 0 && item.y === 0
                              ? 'auto'
                              : Number.MAX_SAFE_INTEGER,
                        }}
                      >
                        {item.url}
                      </Item>
                    </DraggableCore>
                  </ItemPlaceholder>
                );
              })}
            </div>
          </Group>
        </DraggableCore>
      );
    }
  );
  return <Background>{content}</Background>;
});

export default Workspace;
