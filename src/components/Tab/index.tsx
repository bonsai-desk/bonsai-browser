import { observer } from 'mobx-react-lite';
import React from 'react';
import { ipcRenderer } from 'electron';
import { useStore } from '../../store/tab-page-store';
import { ITab, TabPageTab } from '../../interfaces/tab';
import redX from '../../../assets/x-letter.svg';
import hamburgerIcon from '../../../assets/hamburger-menu.svg';
import RedX from '../RedX';
import {
  RedXParent,
  TabImg,
  TabImageDummy,
  TabImageParent,
  TabParent,
  TabTitle,
} from './style';

interface ITabImage {
  hover: boolean;
  title: string;
  imgUrl: string;
  tab: TabPageTab;
  selected: boolean;
}

const TabImage = observer(
  ({ selected, hover, imgUrl, tab, title }: ITabImage) => {
    const { workspaceStore } = useStore();
    return (
      <TabImageParent selected={selected}>
        {imgUrl ? <TabImg src={imgUrl} alt="tab_image" /> : <TabImageDummy />}
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
            }}
            hoverColor="#3572AC"
            onClick={(e) => {
              e.stopPropagation();

              workspaceStore.setChooseWorkspacePos(e.pageX, e.pageY);
              workspaceStore.setSelectedTab(tab);
            }}
          >
            <img src={hamburgerIcon} alt="-" width="20px" />
          </RedX>
        </RedXParent>
      </TabImageParent>
    );
  }
);

const Tab = observer(({ tab, hover, selected = false, callback }: ITab) => {
  const { tabPageStore } = useStore();
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

  const hovering = hover || tabPageStore.hoveringUrlInput;

  return (
    <TabParent
      onClick={() => {
        if (callback) {
          callback();
        } else {
          ipcRenderer.send('set-tab', tab.id);
          tabPageStore.setUrlText('');
        }
      }}
    >
      <TabImage
        selected={selected}
        hover={hovering}
        title={title}
        imgUrl={imgUrl}
        tab={tab}
      />
    </TabParent>
  );
});

export default Tab;
