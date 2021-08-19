import styled, { css } from 'styled-components';
import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import { ipcRenderer } from 'electron';
import { runInAction } from 'mobx';
import { useStore, View } from '../../store/tab-page-store';
import { ITab, TabPageColumn } from '../../interfaces/tab';
import { getRootDomain } from '../../utils/data';
import redX from '../../static/x-letter.svg';
import { HistoryButton } from '../History';
import Favicon from '../Favicon';

export const ColumnParent = styled.div`
  display: flex;
  justify-content: center;
  flex-direction: column;
  user-select: none;
  // padding: 5px 10px 5px 10px;
  margin-right: 1rem;
  color: white;
`;
const ColumnHeaderOverlay = styled.div`
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
const ColumnHeaderSpacer = styled.div`
  width: 10px;
  height: 10px;
`;
export const ColumnHeader = styled.div`
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

export const TabParent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  width: 200px;
  word-wrap: break-word;
  text-overflow: ellipsis;
  margin-bottom: 20px;
  @media (prefers-color-scheme: dark) {
    box-shadow: rgba(255, 255, 255, 0.16) 0px 10px 36px 0px,
      rgba(0, 0, 0, 0.06) 0px 0px 0px 1px;
  }
  @media (prefers-color-scheme: light) {
    box-shadow: rgba(0, 0, 0, 0.16) 0px 10px 36px 0px,
      rgba(0, 0, 0, 0.06) 0px 0px 0px 1px;
  }
  ${({ selected }: { selected: boolean }) => {
    if (selected) {
      return css`
        border-color: white;
        border-style: solid;
        border-width: 4px;
      `;
    }
    return css`
      padding: 4px;
    `;
  }}
`;
export const TabImageParent = styled.div`
  height: 125px;
  width: 200px;
  position: relative;
  border-radius: 10px;
  border-width: 4px;
  border-color: red;
  display: flex;
  justify-content: center;
  overflow: hidden;
  object-fit: cover;
`;

export const RedXParent = styled.div`
  font-size: 0.6rem;
  position: absolute;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  transition-duration: 0.25s;
  opacity: ${({ hover }: { hover: boolean }) => (hover ? 100 : 0)};
`;
export const RedX = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-content: center;
  justify-content: center;
  transition-duration: 0.25s;
  border-radius: 999px;
  position: absolute;
  width: 30px;
  height: 30px;
  background: rgba(200, 200, 200, 0.7);
  :hover {
    transition-duration: 0s;
    background-color: ${({ hoverColor }: { hoverColor: string }) => hoverColor};
  }
`;

export const TabTitle = styled.div`
  width: calc(100% - 40px - 10px);
  height: 100%;
  padding: 5px;
  font-size: 15px;
  overflow: hidden;
`;
export const TabImage = styled.img`
  height: 100%;
  background: white;
`;

export const TabImageDummy = styled.div`
  background-color: black;
  height: 100%;
  width: 100%;
`;

export const TabColumnsParent = styled.div`
  display: flex;
  align-items: flex-start;
  flex-grow: 1;
  overflow: auto;
`;
export const Background = styled.div`
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
`;
const FooterParent = styled.div`
  width: 100%;
  height: 85px;
  display: flex;
  justify-content: center;
  align-items: center;
`;

export const FooterButtonParent = styled.button`
  border: none;
  outline: none;
  width: 75px;
  height: 75px;
  border-radius: 50%;

  :hover {
    background-color: lightgray;
  }
`;

export const Footer = observer(() => {
  const { tabPageStore } = useStore();
  return (
    <FooterParent>
      <FooterButtonParent
        onClick={() => {
          runInAction(() => {
            if (tabPageStore.View === View.Tabs) {
              tabPageStore.View = View.WorkSpace;
            } else if (tabPageStore.View === View.WorkSpace) {
              tabPageStore.View = View.Tabs;
            }
          });
        }}
      >
        WorkSpace
      </FooterButtonParent>
      <HistoryButton />
    </FooterParent>
  );
});

export const Tab = observer(({ tab, hover, selected = false }: ITab) => {
  const { tabPageStore, workspaceStore } = useStore();
  const title =
    tab.openGraphInfo !== null &&
    tab.openGraphInfo.title !== '' &&
    tab.openGraphInfo.title !== 'null'
      ? tab.openGraphInfo.title
      : tab.title;
  const imgUrl =
    tab.openGraphInfo !== null && tab.openGraphInfo.image !== ''
      ? tab.openGraphInfo.image
      : tab.image;
  return (
    <TabParent
      selected={selected}
      onClick={() => {
        ipcRenderer.send('set-tab', tab.id);
        tabPageStore.setUrlText('');
      }}
    >
      <TabImageParent>
        {imgUrl ? <TabImage src={imgUrl} alt="tab_image" /> : <TabImageDummy />}
        <RedXParent hover={hover}>
          <TabTitle>{title === '' ? 'New Tab' : title}</TabTitle>
          <RedX
            style={{
              right: 10,
              top: 10,
            }}
            hoverColor="rgba(255, 0, 0, 1)"
            onClick={(e) => {
              e.stopPropagation();
              ipcRenderer.send('remove-tab', tab.id);
            }}
          >
            <img src={redX} alt="x" width="20px" />
          </RedX>
          <RedX
            style={{
              left: 10,
              bottom: 10,
              width: 105,
            }}
            hoverColor="#3572AC"
            onClick={(e) => {
              e.stopPropagation();
              workspaceStore.createItem(
                tab.url,
                tab.title,
                tab.image,
                tab.favicon,
                workspaceStore.inboxGroup
              );
            }}
          >
            <div>Add to workspace</div>
            {/* <img src={moreIcon} alt="." width="20px" /> */}
          </RedX>
        </RedXParent>
      </TabImageParent>
    </TabParent>
  );
});

const Column = observer(({ column }: { column: TabPageColumn }) => {
  const { tabPageStore } = useStore();
  const [hovered, setHovered] = useState(false);
  let columnFavicon = '';
  if (column.tabs.length > 0) {
    columnFavicon = column.tabs[0].favicon;
  }
  function handleMouseOver() {
    setHovered(true);
  }
  function handleMouseExit() {
    setHovered(false);
  }
  return (
    <ColumnParent onMouseOver={handleMouseOver} onMouseLeave={handleMouseExit}>
      <ColumnHeaderParent>
        <ColumnHeaderSpacer />
        <Favicon src={columnFavicon} />
        <ColumnHeader>{column.domain}</ColumnHeader>
        <ColumnHeaderOverlay>
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
        </ColumnHeaderOverlay>
      </ColumnHeaderParent>
      {column.tabs.map((tab) => {
        return <Tab key={tab.id} tab={tab} hover={hovered} selected={false} />;
      })}
    </ColumnParent>
  );
});

export const TabColumns = observer(() => {
  const { tabPageStore } = useStore();
  return (
    <TabColumnsParent>
      {tabPageStore.tabPageColumns().map((column) => {
        return <Column column={column} key={column.domain} />;
      })}
    </TabColumnsParent>
  );
});
