import { observer } from 'mobx-react-lite';
import { ipcRenderer } from 'electron';
import React from 'react';
import { TabPageColumn } from '../../interfaces/tab';
import { useStore } from '../../store/tab-page-store';
import {
  ColumnHeaderParent,
  HeaderOverlay,
  HeaderSpacer,
  HeaderTitle,
} from './style';
import Favicon from '../Favicon';
import RedX from '../RedX';
import { getRootDomain } from '../../utils/data';
import redX from '../../static/x-letter.svg';

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
            Object.keys(tabPageStore.openTabs).forEach((key: string) => {
              const tab = tabPageStore.openTabs[key];
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

export default ColumnHeader;
