import { observer } from 'mobx-react-lite';
import React from 'react';
// import { runInAction } from 'mobx';
import { TabPageColumn } from '../../interfaces/tab';
import { ColumnParent } from './style';
import ColumnHeader from './ColumnHeader';
import Card from '../Card';
// import { useStore } from '../../store/tab-page-store';

const Column = observer(({ column }: { column: TabPageColumn }) => {
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
        return <Card width={200} key={tab.id} tab={tab} hover active />;
      })}
    </ColumnParent>
  );
});

export default Column;
