import { observer } from 'mobx-react-lite';
import React from 'react';
import { useStore } from '../../store/tab-page-store';
import { Column, ColumnsParent } from './Column';

const Columns = observer(() => {
  const { tabPageStore } = useStore();
  return (
    <ColumnsParent>
      {tabPageStore.tabPageColumns().map((column) => {
        return <Column column={column} key={column.domain} />;
      })}
    </ColumnsParent>
  );
});

export default Columns;
