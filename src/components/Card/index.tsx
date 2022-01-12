import { observer } from 'mobx-react-lite';
import React, { useRef, useState } from 'react';
import { ipcRenderer } from 'electron';
import styled from '@emotion/styled';
import { OpenInBrowser } from '@material-ui/icons';
import path from 'path';
import { useStore } from '../../store/tab-page-store';
import { ITab, tabImage, tabTitle } from '../../interfaces/tab';

import { TabImageParent, TabImg, TabParent } from './style';
import { Tab } from '../Tab';
import { useMiddleClick } from '../../utils/effects';

interface ITabImage {
  imgUrl: string;
  selected: boolean;
  width: number;
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

const TabImage = observer(({ imgUrl, selected, width }: ITabImage) => {
  const { workspaceStore } = useStore();
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgFileUrl = path.join(
    workspaceStore.dataPath,
    'images',
    `${imgUrl}.jpg`
  );
  // width = 200;
  return (
    <TabImageParent
      style={{
        backgroundColor: loaded ? 'transparent' : 'var(--canvas-color)',
        width,
        height: Math.round((9 / 16) * width),
      }}
    >
      {selected ? (
        <SelectedParent>
          <OpenInBrowser />
        </SelectedParent>
      ) : (
        ''
      )}
      {imgFileUrl ? (
        <TabImg
          alt=""
          style={{
            display: error ? 'none' : '',
          }}
          draggable={false}
          src={imgFileUrl ? `file://${imgFileUrl}` : ''}
          onLoad={() => {
            setLoaded(true);
            setError(false);
          }}
          onError={() => {
            setError(true);
          }}
        />
      ) : (
        ''
      )}
    </TabImageParent>
  );
});

const CardTabParent = styled(TabParent)`
  box-shadow: rgba(99, 99, 99, 0.2) 0 2px 8px 0;
  //background-color: red;
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

interface IDummyCard {
  title: string;
  favicon: string;
  imgUrl: string;
  active: boolean;
  onClick?: () => void;
  onClose?: () => void;
  onMiddleClick?: (e: MouseEvent) => void;
  width: number;
  selected?: boolean;
}

export const DummyCard = ({
  title,
  width,
  onClick = undefined,
  onClose = undefined,
  onMiddleClick = undefined,
  active,
  imgUrl,
  favicon,
  selected = false,
}: IDummyCard) => {
  const cardRef = useRef<HTMLDivElement>(null);
  // const disableButtons = typeof onClose === 'undefined';

  useMiddleClick(cardRef, (e) => {
    if (typeof onMiddleClick !== 'undefined') {
      onMiddleClick(e);
    }
  });

  return (
    <CardTabParent
      ref={cardRef}
      style={{ width }}
      onClick={() => {
        if (typeof onClick === 'function') {
          onClick();
        }
      }}
    >
      <Tab
        title={title}
        favicon={favicon}
        active={active}
        width={width}
        onClick={onClick}
        onClose={onClose}
        bigCloseHitbox
      />
      <div
        style={{
          borderBottom: '1px solid var(--canvas-border-color)',
          width: '100%',
        }}
      />
      <TabImage imgUrl={imgUrl} selected={selected} width={width} />
    </CardTabParent>
  );
};

const Card = observer(
  ({ tab, width = 200, active = false, callback, selected = false }: ITab) => {
    const title = tabTitle(tab);
    const imgUrl = tabImage(tab);

    const clickTab = () => {
      if (callback) {
        callback();
      } else {
        ipcRenderer.send('set-tab', tab.id);
      }
    };

    const clickClose = () => {
      ipcRenderer.send('remove-tab', tab.id);
      ipcRenderer.send('mixpanel-track', 'click remove tab in home');
    };

    const handleAuxClick = () => {
      clickClose();
    };

    return (
      <DummyCard
        title={title}
        favicon={tab.favicon}
        imgUrl={imgUrl}
        active={active}
        onClick={clickTab}
        onMiddleClick={handleAuxClick}
        onClose={clickClose}
        width={width}
        selected={selected}
      />
    );
  }
);

export default Card;
