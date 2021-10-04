import { observer } from 'mobx-react-lite';
import React from 'react';
import styled from 'styled-components';
// import { runInAction } from 'mobx';
import { TabPageColumn } from '../../interfaces/tab';
import { ColumnParent } from './style';
import ColumnHeader from './ColumnHeader';
import Tab from '../Tab';
// import { useStore } from '../../store/tab-page-store';

export const ColumnsParent = styled.div`
  display: flex;
  align-items: flex-start;
  flex-grow: 1;
  margin: 0 10px 0 -10px;
  padding: 0 0 0 20px; // this is to stop shadow clipping
  overflow: scroll;
  ::-webkit-scrollbar {
    display: none;
  }
`;

export const Column = observer(({ column }: { column: TabPageColumn }) => {
  return (
    <ColumnParent
      id="Column"
      onMouseOver={() => {
        // handleMouseOver();
      }}
      onMouseLeave={() => {
        // handleMouseExit();
      }}
    >
      <ColumnHeader column={column} />
      {column.tabs.map((tab) => {
        return <Tab key={tab.id} tab={tab} hover selected={false} />;
      })}
    </ColumnParent>
  );
});
