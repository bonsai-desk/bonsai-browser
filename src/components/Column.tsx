import styled from 'styled-components';
import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import { ipcRenderer } from 'electron';
import { useStore } from '../store/tab-page-store';
import { TabPageColumn } from '../interfaces/tab';
import Favicon from './Favicon';
import { getRootDomain } from '../utils/data';
import redX from '../static/x-letter.svg';
import Tab from './Tab';
import RedX from './RedX';

const ColumnParent = styled.div`
  display: flex;
  justify-content: center;
  flex-direction: column;
  user-select: none;
  margin-right: 1rem;
  color: white;
  background-color: blue;
  width: 20rem;
`;
const HeaderOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 10px;
  transition-duration: 0.25s;

  :hover {
    background-color: rgba(0, 0, 0, 0.6);
  }
`;
const ColumnHeaderParent = styled.div`
  display: flex;
  align-items: center;
  width: 100%;
  border-radius: 10px;
  height: 40px;
  margin-bottom: 5px;
  transition-duration: 0.25s;
  position: relative;
  overflow: hidden;

  :hover #RedX {
    opacity: 100;
  }

  #RedX {
    opacity: 0;
  }
`;
const HeaderSpacer = styled.div`
  width: 10px;
  height: 10px;
`;
const HeaderTitle = styled.div`
  text-shadow: 0 0 5px #9c9c9c;
  font-weight: bold;
  font-size: 1.35rem;
  margin-bottom: 10px;
  width: 174px;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
  margin-left: 5px;
`;
const TabColumnsParent = styled.div`
  display: flex;
  align-items: flex-start;
  flex-grow: 1;
  overflow: auto;
`;
const ColumnHeader = observer(({ column }: { column: TabPageColumn }) => {
  const { tabPageStore } = useStore();
  let columnFavicon = '';
  if (column.tabs.length > 0) {
    columnFavicon = column.tabs[0].favicon;
  }
  return (
    <ColumnHeaderParent>
      <HeaderSpacer />
      <Favicon src={columnFavicon} />
      <HeaderTitle>{column.domain}</HeaderTitle>
      <HeaderOverlay>
        <RedX
          id="RedX"
          style={{
            top: 7,
            right: 10,
          }}
          hoverColor="rgba(255, 0, 0, 1)"
          onClick={(e) => {
            e.stopPropagation();
            Object.keys(tabPageStore.tabs).forEach((key: string) => {
              const tab = tabPageStore.tabs[key];
              if (getRootDomain(tab.url) === column.domain) {
                ipcRenderer.send('remove-tab', tab.id);
              }
            });
          }}
        >
          <img src={redX} alt="x" width="20px" />
        </RedX>
      </HeaderOverlay>
    </ColumnHeaderParent>
  );
});
const Column = observer(({ column }: { column: TabPageColumn }) => {
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
const TabColumns = observer(() => {
  const { tabPageStore } = useStore();
  return (
    <TabColumnsParent>
      {tabPageStore.tabPageColumns().map((column) => {
        return <Column column={column} key={column.domain} />;
      })}
    </TabColumnsParent>
  );
});

export default TabColumns;
