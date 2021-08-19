import { observer } from 'mobx-react-lite';
import React from 'react';
import { useStore } from '../../store/tab-page-store';
import { Column, TabColumnsParent } from './Column';

const Columns = observer(() => {
  const { tabPageStore } = useStore();
  return (
    <TabColumnsParent>
      {tabPageStore.tabPageColumns().map((column) => {
        return <Column column={column} key={column.domain} />;
      })}
    </TabColumnsParent>
  );
});

export default Columns;
