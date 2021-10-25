import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
// import { Grid } from '@material-ui/core';
import { SpringGrid } from 'react-stonecutter';
import { useStore, View } from '../../store/tab-page-store';
import Column from './Column';
import SelectWorkspaceModal from './SelectWorkspaceModal';
import HomeParent from '../Home';
import Tab from '../Card';

enum HomeStyle {
  Columns,
  ImageBoard,
}

const ImageBoardParent = styled(HomeParent)`
  //align-items: center;
  //background-color: darkgray;
  justify-content: center;
  //background-color: red;
  margin-top: 2rem;
`;

// const FakeTab = styled.div`
//   background-color: red;
//   width: 100px;
//   height: 100px;
// `;

const GridParent = styled.div`
  //background-color: white;
`;

const ImageBoard = observer(() => {
  const { tabPageStore } = useStore();

  useEffect(() => {
    setTimeout(() => {
      if (tabPageStore.View === View.Tabs) {
        tabPageStore.syncBumpOrder();
      }
    }, 100);
  }, []);

  const Grid = SpringGrid;
  return (
    <ImageBoardParent>
      <GridParent
        onMouseLeave={() => {
          tabPageStore.syncBumpOrder();
        }}
      >
        <Grid columns={4} columnWidth={200} gutterWidth={25} gutterHeight={25}>
          {tabPageStore
            .tabPageOrdered(tabPageStore.tabBumpOrder)
            .map((tab, index) => {
              if (tab) {
                return (
                  <div key={tab.id}>
                    <Tab
                      style={{ width: '200px' }}
                      tab={tab}
                      hover
                      active
                      width={200 - 13}
                    />
                  </div>
                );
              }
              return (
                <div
                  key={`d-${tabPageStore.tabBumpOrder[index]}`}
                  style={{
                    height: '10px',
                    width: '200px',
                  }}
                />
              );
            })}
        </Grid>
      </GridParent>
    </ImageBoardParent>
  );
});

const Columns = observer(() => {
  const { tabPageStore } = useStore();
  const [homeStyle] = useState(HomeStyle.ImageBoard);

  switch (homeStyle) {
    case HomeStyle.Columns:
      return (
        <HomeParent>
          {tabPageStore.tabPageColumns().map((column) => {
            return <Column column={column} key={column.domain} />;
          })}
          <SelectWorkspaceModal />
        </HomeParent>
      );
    case HomeStyle.ImageBoard:
      return <ImageBoard />;
    default:
      return <HomeParent>default</HomeParent>;
  }
});

export default Columns;
