import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import styled from 'styled-components';
import { TabPageColumn } from '../../interfaces/tab';
import { ColumnParent } from './style';
import ColumnHeader from './ColumnHeader';
import Tab from '../Tab';

export const TabColumnsParent = styled.div`
  display: flex;
  align-items: flex-start;
  flex-grow: 1;
  overflow: auto;
`;

export const Column = observer(({ column }: { column: TabPageColumn }) => {
  // const { tabPageStore } = useStore();
  const [hovered, setHovered] = useState(false);
  // let columnFavicon = '';
  // if (column.tabs.length > 0) {
  //   columnFavicon = column.tabs[0].favicon;
  // }
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
