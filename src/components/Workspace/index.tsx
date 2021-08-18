import React, { useRef } from 'react';
import styled from 'styled-components';
import { observer } from 'mobx-react-lite';
import { Instance } from 'mobx-state-tree';
import { ItemGroup } from '../../store/workspace-store';
import trashIcon from '../../../assets/alternate-trash.svg';
import { useStore } from '../../store/tab-page-store';
import MainGroup from './mainGroup';
import MainItem from './mainItem';

const Background = styled.div`
  user-select: none;
  flex-grow: 1;
  background-color: white;
  border-radius: 10px;
  position: relative;
  overflow: hidden;
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
  z-index: 10000001;
  border-radius: 0 20px 0 0;
`;

const TrashIcon = styled.img`
  width: 75px;
`;

const Groups = styled.div``;
const Items = styled.div``;

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

  if (backgroundRef.current !== null) {
    const rect = backgroundRef.current.getBoundingClientRect();
    workspaceStore.setSize(rect.width, rect.height);
  }

  return (
    <Background ref={backgroundRef}>
      <Groups>{groups}</Groups>
      <MainGroup group={workspaceStore.inboxGroup} />
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
