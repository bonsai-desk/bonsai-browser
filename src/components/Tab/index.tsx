import styled, { css } from 'styled-components';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { ipcRenderer } from 'electron';
import { useStore } from '../../store/tab-page-store';
import { ITab } from '../../interfaces/tab';
import redX from '../../static/x-letter.svg';
import RedX from '../RedX';

const TabParent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  word-wrap: break-word;
  text-overflow: ellipsis;
  margin-bottom: 20px;
  height: 9rem;
  width: 100%;
  background-color: black;
  @media (prefers-color-scheme: dark) {
    box-shadow: rgba(255, 255, 255, 0.16) 0 10px 36px 0,
      rgba(0, 0, 0, 0.06) 0 0 0 1px;
  }
  @media (prefers-color-scheme: light) {
    box-shadow: rgba(0, 0, 0, 0.16) 0 10px 36px 0, rgba(0, 0, 0, 0.06) 0 0 0 1px;
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
const TabImageParent = styled.div`
  width: 100%;
  height: 100%;
  position: relative;
  border-radius: 10px;
  border-width: 4px;
  display: flex;
  justify-content: center;
  overflow: hidden;
  object-fit: cover;
`;
const RedXParent = styled.div`
  font-size: 0.6rem;
  position: absolute;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  transition-duration: 0.25s;
  opacity: ${({ hover }: { hover: boolean }) => (hover ? 100 : 0)};
`;
const TabTitle = styled.div`
  width: calc(100% - 40px - 10px);
  height: 100%;
  padding: 5px;
  font-size: 15px;
  overflow: hidden;
`;
const TabImage = styled.img`
  height: 100%;
  background: white;
`;
const TabImageDummy = styled.div`
  background-color: black;
  height: 100%;
  width: 100%;
`;

const Tab = observer(({ tab, hover, selected = false }: ITab) => {
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

export default Tab;
