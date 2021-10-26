import { observer } from 'mobx-react-lite';
import React, { useRef } from 'react';
import { ipcRenderer } from 'electron';
import styled from '@emotion/styled';
import { OpenInBrowser } from '@material-ui/icons';
import { useStore } from '../../store/tab-page-store';
import { ITab, TabPageTab } from '../../interfaces/tab';

import { TabImageParent, TabParent } from './style';
import { Tab } from '../Tab';
import { useMiddleClick } from '../../utils/effects';

interface ITabImage {
  hover: boolean;
  title: string;
  imgUrl: string;
  tab: TabPageTab;
  disableButtons?: boolean;
  selected: boolean;
}

const SelectedParent = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  background-color: rgba(0, 0, 0, 0.5);
  width: 100%;
  height: 100%;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-content: center;
  color: white;
  svg {
    font-size: 3rem;
  }
`;

const TabImage = observer(({ imgUrl, selected }: ITabImage) => {
  return (
    <TabImageParent img={`url(${imgUrl})`}>
      {selected ? (
        <SelectedParent>
          <OpenInBrowser />
        </SelectedParent>
      ) : (
        ''
      )}
    </TabImageParent>
  );
});

const CardTabParent = styled(TabParent)`
  background-color: #d9dde2;
  #tab-inner {
    border-right: none;
  }
  :hover {
    #tab-inner {
      border-right: none;
    }
  }
  div.is-active {
    #tab-inner {
      border-right: none;
    }
  }
`;

const Card = observer(
  ({
    tab,
    hover,
    active = false,
    callback,
    disableButtons = false,
    style = {},
    width = 200,
    selected = false,
  }: ITab) => {
    const { tabPageStore } = useStore();
    let title =
      tab.openGraphInfo !== null &&
      tab.openGraphInfo.title !== '' &&
      tab.openGraphInfo.title !== 'null'
        ? tab.openGraphInfo.title
        : tab.title;
    if (!title) {
      title = 'New Tab';
    }
    const imgUrl =
      tab.openGraphInfo !== null && tab.openGraphInfo.image !== ''
        ? tab.openGraphInfo.image
        : tab.image;

    const hovering = hover || tabPageStore.hoveringUrlInput;

    function clickTab() {
      if (callback) {
        callback();
      } else {
        ipcRenderer.send('set-tab', tab.id);
        ipcRenderer.send('mixpanel-track', 'click home tab');
        tabPageStore.setUrlText('');
      }
    }

    function clickClose(
      e: MouseEvent | React.MouseEvent<HTMLDivElement, MouseEvent>
    ) {
      e.stopPropagation();
      ipcRenderer.send('remove-tab', tab.id);
      ipcRenderer.send('mixpanel-track', 'click remove tab in home');
    }

    const handleAuxClick = (e: MouseEvent) => {
      clickClose(e);
    };

    const cardRef = useRef<HTMLDivElement>(null);

    useMiddleClick(cardRef, handleAuxClick);

    return (
      <CardTabParent
        ref={cardRef}
        style={style}
        onClick={() => {
          clickTab();
        }}
      >
        <Tab
          disableButtons={disableButtons}
          title={title}
          active={active}
          width={width}
          tab={tab}
          clickTab={() => {
            clickTab();
          }}
          clickClose={(e) => {
            clickClose(e);
          }}
          bigCloseHitbox
        />
        <div
          style={{
            borderBottom: '1px solid #dee1e6',
            width: '100%',
          }}
        />
        <TabImage
          disableButtons={disableButtons}
          hover={hovering}
          title={title}
          imgUrl={imgUrl}
          tab={tab}
          selected={selected}
        />
      </CardTabParent>
    );
  }
);

export default Card;
