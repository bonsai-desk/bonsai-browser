import { observer } from 'mobx-react-lite';
import { ipcRenderer } from 'electron';
import React from 'react';
import { TabPageColumn } from '../../interfaces/tab';
import { useStore } from '../../store/tab-page-store';
import {
  ColumnHeaderParent,
  FaviconParent,
  FaviconX,
  HeaderFavicon,
  HeaderTitle,
} from './style';
import { getRootDomain } from '../../utils/data';

const ColumnHeader = observer(({ column }: { column: TabPageColumn }) => {
  const { tabPageStore } = useStore();
  let columnFavicon = '';
  if (column.tabs.length > 0) {
    columnFavicon = column.tabs[0].favicon;
    if (columnFavicon) {
      columnFavicon = `url(${columnFavicon})`;
    }
  }
  return (
    <ColumnHeaderParent>
      <div>
        <FaviconParent>
          <FaviconX
            id="FaviconX"
            onClick={(e) => {
              e.stopPropagation();
              const keys = Object.keys(tabPageStore.openTabs);
              ipcRenderer.send('mixpanel-track-with-props', [
                'click remove column in home',
                { num_tabs: keys.length },
              ]);
              keys.forEach((key: string) => {
                const tab = tabPageStore.openTabs[key];
                if (getRootDomain(tab.url) === column.domain) {
                  ipcRenderer.send('remove-tab', tab.id);
                }
              });
            }}
          />
          <HeaderFavicon id="Favicon" img={columnFavicon} />
        </FaviconParent>
      </div>
      <HeaderTitle>{column.domain}</HeaderTitle>
    </ColumnHeaderParent>
  );
});

export default ColumnHeader;
