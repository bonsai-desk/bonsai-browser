import styled from 'styled-components';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { ipcRenderer } from 'electron';
import { useStore } from '../../store/tab-page-store';
import { ITab, TabPageColumn, TabPageTab } from '../../interfaces/tab';
import { getRootDomain } from '../../utils/data';
import redX from '../../static/x-letter.svg';

export const Column = styled.div`
  display: flex;
  justify-content: center;
  flex-direction: column;
  //align-items: center;
  user-select: none;
  padding: 5px 10px 5px 10px;
  margin-right: 25px;
  border-radius: 25px;
  color: white;
  //background-color: blue;
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
    background-color: rgba(0, 0, 0, 0.5);
  }
`;
const ColumnHeaderParent = styled.div`
  display: flex;
  align-items: center;
  width: 100%;
  border-radius: 10px;
  //background-color: red;
  height: 40px;
  margin-bottom: 5px;
  transition-duration: 0.25s;
  position: relative;
  
  :hover #RedX {
    //transition-duration: 0s;
    opacity: 100;
  }
  #RedX {
    transition-duration: 0.25s;
    opacity: 0;
    border-radius: 999px;
    position: absolute;
    top: 5px;
    right: 15px;
    width: 30px;
    height: 30px;
    background: rgba(200, 200, 200, 0.7);
    :hover {
      transition-duration: 0s;
      background: rgba(255, 0, 0, 1);
    }
`;
const ColumnHeaderSpacer = styled.div`
  //background-color: yellow;
  width: 10px;
  height: 10px;
`;
export const ColumnHeader = styled.div`
  font-weight: bold;
  font-size: 1.35rem;
  margin-bottom: 10px;
  //background-color: red;
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
`;
export const TabImageParent = styled.div`
  height: 125px;
  width: 200px;
  position: relative;
  border-radius: 10px;
  display: flex;
  justify-content: center;
  overflow: hidden;
  object-fit: cover;
  :hover {
    .title {
      opacity: 100;
      background: red;
    }
  }
`;
export const RedX = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-content: center;
  justify-content: center;
`;
export const RedXParent = styled.div`
  font-size: 0.6rem;
  position: absolute;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  transition-duration: 0.25s;
  opacity: 0;
  :hover {
    opacity: 100;
  }
  :hover #RedX {
    //transition-duration: 0s;
  }
  #RedX {
    transition-duration: 0.25s;
    border-radius: 999px;
    position: absolute;
    top: 10px;
    right: 10px;
    width: 30px;
    height: 30px;
    background: rgba(200, 200, 200, 0.7);
    :hover {
      transition-duration: 0s;
      background: rgba(255, 0, 0, 1);
    }
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
export const Favicon = styled.img`
  width: 16px;
  height: 16px;
  //margin-left: 40px;
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
  border-radius: 25px;
  display: flex;
  flex-direction: column;
`;
export const Footer = styled.div`
  width: 100%;
  height: 85px;
  display: flex;
  justify-content: center;
  align-items: center;
`;

export const FooterButton = styled.button`
  border: none;
  outline: none;
  width: 75px;
  height: 75px;
  border-radius: 50%;

  :hover {
    background-color: lightgray;
  }
`;

export const Tab = observer(({ tab }: ITab) => {
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
      onClick={() => {
        ipcRenderer.send('set-tab', tab.id);
      }}
    >
      <TabImageParent>
        <TabImage src={imgUrl} alt="tab_image" />
        <RedXParent>
          <TabTitle>{title === '' ? 'New Tab' : title}</TabTitle>
          <RedX
            id="RedX"
            onClick={(e) => {
              e.stopPropagation();
              ipcRenderer.send('remove-tab', tab.id);
            }}
          >
            <img src={redX} alt="x" width="20px" />
          </RedX>
        </RedXParent>
      </TabImageParent>
    </TabParent>
  );
});

export const TabColumns = observer(() => {
  const { tabPageStore } = useStore();
  return (
    <>
      {tabPageStore.tabPageColumns().map((column) => {
        let columnFavicon = '';
        if (column.tabs.length > 0) {
          columnFavicon = column.tabs[0].favicon;
        }

        return (
          <Column key={column.domain}>
            <ColumnHeaderParent>
              <ColumnHeaderSpacer />
              <Favicon src={columnFavicon} />
              <ColumnHeader>{column.domain}</ColumnHeader>
              <ColumnHeaderOverlay>
                <RedX
                  id="RedX"
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
              return <Tab key={tab.id} tab={tab} />;
            })}
          </Column>
        );
      })}
    </>
  );
});
