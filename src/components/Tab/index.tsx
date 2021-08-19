import { observer } from 'mobx-react-lite';
import React from 'react';
import { ipcRenderer } from 'electron';
import { useStore } from '../../store/tab-page-store';
import { ITab } from '../../interfaces/tab';
import redX from '../../static/x-letter.svg';
import RedX from '../RedX';
import {
  RedXParent,
  TabImage,
  TabImageDummy,
  TabImageParent,
  TabParent,
  TabTitle,
} from './style';

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
