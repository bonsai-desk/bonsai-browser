import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import styled from 'styled-components';
import { TabPageColumn } from '../../interfaces/tab';
import { ColumnParent } from './style';
import ColumnHeader from './ColumnHeader';
import Tab from '../Tab';

export const ColumnsParent = styled.div`
  display: flex;
  align-items: flex-start;
  flex-grow: 1;
  overflow: auto;
`;

export const Column = observer(({ column }: { column: TabPageColumn }) => {
  const [hovered, setHovered] = useState(false);
  function handleMouseOver() {
    setHovered(true);
  }

  function handleMouseExit() {
    setHovered(false);
  }

  return (
    <ColumnParent onMouseOver={handleMouseOver} onMouseLeave={handleMouseExit}>
      <ColumnHeader column={column} />
      {column.tabs.map((tab) => {
        return <Tab key={tab.id} tab={tab} hover={hovered} selected={false} />;
      })}
    </ColumnParent>
  );
});
