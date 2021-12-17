import { observer } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import styled from 'styled-components';
import { SpringGrid } from 'react-stonecutter';
import { TabViewType, useStore, View } from '../../store/tab-page-store';
import Column from './Column';
import SelectWorkspaceModal from './SelectWorkspaceModal';
import Card from '../Card';
import HomeParent, { HomeParentScrollBars } from '../Home';
import { clamp } from '../../utils/utils';

const ImageBoardParent = styled(HomeParent)`
  //align-items: center;
  //background-color: darkgray;
  justify-content: center;
  //background-color: red;
  margin-top: calc(2rem - 10px);
  padding-top: 10px;
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
  if (tabPageStore.View !== View.Tabs) {
    return <HomeParent />;
  }

  const columnWidth = 200;
  const gutter = 25;
  const columns = clamp(
    Math.floor(tabPageStore.windowSize.width / (columnWidth + gutter)),
    1,
    4
  );
  return (
    <ImageBoardParent>
      <GridParent
        onMouseLeave={() => {
          tabPageStore.syncBumpOrder();
        }}
      >
        <Grid
          columns={columns}
          columnWidth={columnWidth}
          gutterWidth={gutter}
          gutterHeight={gutter}
        >
          {tabPageStore
            .tabPageOrdered(tabPageStore.tabBumpOrder)
            .map((tab, index) => {
              if (tab) {
                return (
                  <div key={tab.id}>
                    <Card tab={tab} hover active width={200} />
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

const HomePageTabs = observer(() => {
  const { tabPageStore } = useStore();

  switch (tabPageStore.TabView) {
    case TabViewType.Column:
      return (
        <HomeParentScrollBars>
          {tabPageStore.tabPageColumns().map((column) => {
            return <Column column={column} key={column.domain} />;
          })}
          <SelectWorkspaceModal />
        </HomeParentScrollBars>
      );
    case TabViewType.Grid:
      return <ImageBoard />;
    default:
      return (
        <HomeParent>{`Invalid tabView: ${tabPageStore.TabView}`}</HomeParent>
      );
  }
});

export default HomePageTabs;
