import { observer } from 'mobx-react-lite';
import React from 'react';
import { Box, Typography } from '@mui/material';
import styled from 'styled-components';
import { ipcRenderer } from 'electron';
import { Home } from '@material-ui/icons';
import { HomeView, useStore } from '../store/tab-page-store';
import { tabImage, TabPageTab, tabTitle } from '../interfaces/tab';
import { DummyCard } from './Card';
import { clamp, useWindowSize } from '../utils/utils';
import { color } from '../utils/jsutils';
import { ColumnContainer } from './Column';
import ControlledList from './ControlledPageList';
import { tabsToItems, tabsToItemsByDomain } from '../utils/xutils';

export const HomeTitle = styled.div`
  margin: 36px 0 30px 36px;
  background-color: red;
`;

const ViewHeader = ({
  active,
  children,
  onClick = () => {},
}: {
  active: boolean;
  children: string;
  onClick?: () => void;
}) => (
  <Typography
    variant="body1"
    component="div"
    sx={{
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: 'center',
      transitionDuration: '0.2s',
      color: !active
        ? color('body-text-color', 'opacity-med')
        : color('body-text-color'),
      width: `${(4 / 6) * children.length}em`,
    }}
  >
    <Box onClick={onClick}>{children}</Box>
  </Typography>
);

const RecentHomeList = observer(() => {
  const { tabPageStore } = useStore();

  const items = tabsToItems(
    tabPageStore,
    tabPageStore.openTabsBySorting(tabPageStore.tabBumpOrder),
    false,
    'home (recent)'
  );

  return (
    <ControlledList
      items={items}
      initialHighlightedItemId={
        tabPageStore.highlightedTabId.toString(10) || '-1'
      }
    />
  );
});

const DomainHomeList = observer(() => {
  const { tabPageStore } = useStore();

  const items = tabsToItemsByDomain(
    tabPageStore,
    Object.values(tabPageStore.openTabs),
    false,
    'home (domains)'
  );

  return (
    <ControlledList
      items={items}
      initialHighlightedItemId={
        tabPageStore.highlightedTabId.toString(10) || '-1'
      }
    />
  );
});

const HomeListContent = observer(() => {
  const { tabPageStore } = useStore();

  switch (tabPageStore.homeView) {
    case HomeView.Domain:
      return <DomainHomeList />;
    case HomeView.List:
      return <RecentHomeList />;
    default:
      return <RecentHomeList />;
  }
});

interface IHomeHUD {
  tab: TabPageTab;
  width: number;
}

const HomeHUD = observer(({ tab, width }: IHomeHUD) => {
  const title = tabTitle(tab);
  const imgUrl = tabImage(tab);
  const { favicon } = tab;
  const onClick = () => {
    ipcRenderer.send('set-tab', tab.id);
  };
  return (
    <div>
      <DummyCard
        active
        title={title}
        url={tab.url}
        favicon={favicon}
        imgUrl={imgUrl}
        onClick={onClick}
        width={Math.round(width * 0.8)}
      />
    </div>
  );
});

const HomeHeader = observer(() => {
  const { tabPageStore } = useStore();

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap' }}>
      <Home
        sx={{
          margin: '0 10px 0 0',
          color: color('body-text-color', 'opacity-med'),
        }}
      />
      <ViewHeader
        onClick={() => {
          tabPageStore.setHomeView(HomeView.List);
        }}
        active={tabPageStore.homeView === HomeView.List}
      >
        Recent
      </ViewHeader>
      {' • '}
      <ViewHeader
        onClick={() => {
          tabPageStore.setHomeView(HomeView.Domain);
        }}
        active={tabPageStore.homeView === HomeView.Domain}
      >
        Domains
      </ViewHeader>
    </div>
  );
});

const HomeListView = observer(() => {
  const { tabPageStore } = useStore();

  const tab = tabPageStore.openTabs[tabPageStore.activeHomeTabId];

  const { width: windowWidth } = useWindowSize();

  const defaultWidth = 260;

  const infoWidth = !windowWidth
    ? defaultWidth
    : Math.round(clamp((2 / 12) * windowWidth, defaultWidth, 2 * defaultWidth));

  return (
    <ColumnContainer
      Header={<HomeHeader />}
      Left={<HomeListContent />}
      Right={tab ? <HomeHUD tab={tab} width={infoWidth} /> : <div />}
    />
  );
});

export default HomeListView;
