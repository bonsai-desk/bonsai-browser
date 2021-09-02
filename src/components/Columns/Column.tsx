import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import styled from 'styled-components';
import { TabPageColumn } from '../../interfaces/tab';
import { ColumnParent } from './style';
import ColumnHeader from './ColumnHeader';
import Tab from '../Tab';
import { useStore } from '../../store/tab-page-store';

export const ColumnsParent = styled.div`
  display: flex;
  align-items: flex-start;
  flex-grow: 1;
  margin: 0 10px 0 10px;
  overflow: scroll;
  ::-webkit-scrollbar {
    display: none;
  }
`;

export const Column = observer(({ column }: { column: TabPageColumn }) => {
  const { tabPageStore } = useStore();
  const [hovered, setHovered] = useState(false);
  function handleMouseOver() {
    tabPageStore.hoveringUrlInput = false;
    setHovered(true);
  }

  function handleMouseExit() {
    setHovered(false);
  }

  return (
    <ColumnParent
      id="Column"
      onMouseOver={handleMouseOver}
      onMouseLeave={handleMouseExit}
    >
      <ColumnHeader column={column} />
      {column.tabs.map((tab) => {
        return <Tab key={tab.id} tab={tab} hover={hovered} selected={false} />;
      })}
    </ColumnParent>
  );
});
