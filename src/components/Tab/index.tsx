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
  TabImageParent,
  TabParent,
  TabTitle,
  TitleParent,
} from './style';

interface ITabImage {
  hover: boolean;
  title: string;
  imgUrl: string;
  tab: TabPageTab;
  selected: boolean;
  disableButtons?: boolean;
}

const TabImage = observer(
  ({
    selected,
    hover,
    imgUrl,
    tab,
    title,
    disableButtons = false,
  }: ITabImage) => {
    const { workspaceStore } = useStore();
    return (
      <TabImageParent img={`url(${imgUrl})`} selected={selected}>
        <TitleParent hover={hover}>
          <TabTitle>{title === '' ? 'New Tab' : title}</TabTitle>
        </TitleParent>
        <RedXParent disableHover={disableButtons}>
          <RedX
            style={{
              left: '0.5rem',
              bottom: '0.5rem',
            }}
            hoverColor="rgba(255, 0, 0, 1)"
            onClick={(e) => {
              e.stopPropagation();
              ipcRenderer.send('remove-tab', tab.id);
            }}
          >
            <img draggable={false} src={redX} alt="x" width="30px" />
          </RedX>
          <RedX
            style={{
              right: '0.5rem',
              bottom: '0.5rem',
            }}
            hoverColor="#3572AC"
            onClick={(e) => {
              e.stopPropagation();

              workspaceStore.setChooseWorkspacePos(e.pageX, e.pageY);
              workspaceStore.setSelectedTab(tab);
            }}
          >
            <img src={hamburgerIcon} alt="-" width="15px" />
          </RedX>
        </RedXParent>
      </TabImageParent>
    );
  }
);

const Tab = observer(
  ({
    tab,
    hover,
    selected = false,
    callback,
    disableButtons = false,
  }: ITab) => {
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
            ipcRenderer.send('mixpanel-track', 'click home tab');
            tabPageStore.setUrlText('');
          }
        }}
      >
        <TabImage
          disableButtons={disableButtons}
          selected={selected}
          hover={hovering}
          title={title}
          imgUrl={imgUrl}
          tab={tab}
        />
      </TabParent>
    );
  }
);

export default Tab;
