/* eslint-disable react/jsx-props-no-spreading */
import styled from 'styled-components';
import { observer } from 'mobx-react-lite';
import React, { useRef } from 'react';
import { ipcRenderer } from 'electron';
import { Close, Public } from '@material-ui/icons';
import { useStore } from '../../store/tab-page-store';
import { TabPageTab } from '../../interfaces/tab';
import { color } from '../../utils/jsutils';
import { useMiddleClick } from '../../utils/effects';

export const TabsParent = styled.div`
  overflow: hidden;
  z-index: 1;
  border-radius: 10px 10px 0 0;
  width: 500px;
  position: absolute;
  top: 0;
  left: 0;
  //height: 70px;
  border-bottom: 1px solid var(--canvas-border-color);
  //background-color: red;
  box-shadow: rgba(99, 99, 99, 0.2) 0px 2px 8px 0px;
`;
export const TabParent = styled.div`
  position: relative;
  cursor: default !important;
  width: ${({ width }: { width: number }) => `${width}px`};
  //padding: 0 0 0 13px;
  height: 35px;
  display: flex;
  flex-wrap: wrap;
  align-content: center;
  border-radius: 10px 10px 0 0;
  background-color: transparent;
  transition-duration: 0.1s;
  overflow: hidden;

  margin: 0 0 0 -1px;

  :hover {
    background-color: var(--canvas-inactive-hover);

    //#tab-inner {
    //  border-right: 1px solid transparent;
    //}
    #divider {
      background-color: transparent;
    }
  }

  &.is-active {
    background-color: var(--canvas-color);

    :hover {
      background-color: var(--canvas-color);
    }

    //#tab-inner {
    //  border-right: 1px solid transparent;
    //}

    #divider {
      background-color: transparent;
    }
  }
`;

const Divider = styled.div`
  height: 19px;
  width: 1px;
  background-color: var(--tab-divider-color);
  position: absolute;
  top: 8px;
  right: 0;
`;

const BigButtonHitbox = styled.div`
  position: absolute;
  right: 0;
  top: 0;
  display: flex;
  flex-wrap: wrap;
  align-content: center;
  height: 35px;
  width: 24px;
  padding-left: 8px;

  :hover {
    #tab-button {
      background-color: ${color('body-text-color', 'opacity-lower')};
    }
  }

  :active,
  :hover:active,
  &.is-active {
    #tab-button {
      color: ${color('body-text-color')};
      background-color: ${color('body-text-color', 'opacity-lower')};
    }
  }

  :active,
  :hover:active,
  :active.is-active {
    #tab-button {
      background-color: ${color('body-text-color', 'opacity-low')};
    }
  }
`;
export const TabButton = styled.div`
  border-radius: 50%;
  width: 16px;
  height: 16px;

  color: ${color('body-text-color')};
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-content: center;

  svg {
    font-size: 14px;
  }

  :hover {
    background-color: ${color('body-text-color', 'opacity-lower')};
  }

  :active,
  :hover:active,
  &.is-active {
    color: ${color('body-text-color')};
    background-color: ${color('body-text-color', 'opacity-lower')};
  }

  :active,
  :hover:active,
  :active.is-active {
    background-color: ${color('body-text-color', 'opacity-low')};
  }
}`;

// noinspection CssInvalidPropertyValue
export const Favicon = styled.div`
  position: relative;
  height: 16px;
  background-size: cover;
  background-repeat: no-repeat;
  background-position: center center;
  mask-size: cover;
  mask-repeat: no-repeat;
  mask-position: center center;
  image-rendering: -webkit-optimize-contrast;
`;
export const TabInner = styled.div`
  width: calc(100%);
  padding: 0 8px 0 0;
  height: 19px;
  //border-right: 1px solid #808387;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-content: center;
`;
export const FavTitle = styled.div`
  height: 16px;
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-content: center;
  font-size: 12px;
  overflow: hidden;
`;

const Title = styled.div`
  color: ${color('body-text-color')};
  height: 15px;
  margin: -1px 0 0 0;
  //text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
  position: absolute;
`;

interface ITab {
  title: string;
  active: boolean;
  width: number;
  tab: TabPageTab;
  clickClose?: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
  clickTab?: () => void;
  bigCloseHitbox?: boolean;
  disableButtons?: boolean;
}

const FavImage = styled.div`
  position: relative;
  height: 16px;
  svg {
    position: absolute;
    top: -4px;
    left: 0;
    color: var(--body-text-color);
    width: 100%;
  }
`;

export const Tab = observer(
  ({
    title,
    active,
    width,
    tab,
    clickClose = () => {},
    clickTab = () => {},
    bigCloseHitbox = false,
    disableButtons = false,
  }: ITab) => {
    const { tabPageStore } = useStore();

    const tabRef = useRef<HTMLDivElement>(null);
    function handleAuxClick(e: MouseEvent) {
      if (e.button === 1) {
        tabPageStore.closeTab(tab.id, active);
        ipcRenderer.send('mixpanel-track', 'middle click remove tab in bar');
      }
    }

    useMiddleClick(tabRef, handleAuxClick);

    // todo

    const SmallCloseButton = () => (
      <BigButtonHitbox>
        <TabButton
          onClick={(e) => {
            clickClose(e);
          }}
        >
          <Close />
        </TabButton>
      </BigButtonHitbox>
    );
    const BigCloseButton = () => (
      <BigButtonHitbox
        onClick={(e) => {
          clickClose(e);
        }}
      >
        <TabButton id="tab-button">
          <Close />
        </TabButton>
      </BigButtonHitbox>
    );

    const CloseButton = bigCloseHitbox ? BigCloseButton : SmallCloseButton;

    // const disableClose = !active || disableButtons || width <= 80;
    const closeEnabled = active || !(disableButtons || width <= 80);
    const faviconDisabled = closeEnabled && width < 48;

    // ipcRenderer.send('log-data', width);

    const faviconChop = Math.max(0, 22 - width);
    const faviconWidth = 16 - faviconChop;
    const innerMargin = Math.min(13, width / 2 - 8 + faviconChop / 2);

    if (active) {
      if (width < 32) {
        // eslint-disable-next-line no-param-reassign
        width = 32;
      }
    }

    const titleWidth = faviconDisabled
      ? `${Math.max(0, Math.round((width - 16) / 2 - 10))}px`
      : '100%';
    // ipcRenderer.send('log-data', titleWidth);

    const favTitleWidth = closeEnabled
      ? 'max(calc(100% - 16px), 10px)'
      : 'max(calc(100%), 10px)';

    const FaviconAndFallback = () => {
      if (tab.favicon) {
        return (
          <Favicon
            style={{
              width: `${faviconWidth}px`,
              backgroundImage: `url(${tab.favicon})`,
            }}
          />
        );
      }
      return (
        <FavImage
          style={{
            width: `${faviconWidth}px`,
          }}
        >
          <Public />
        </FavImage>
      );
    };

    return (
      <TabParent
        id="tab"
        ref={tabRef}
        width={width}
        className={active ? 'is-active' : ''}
        onClick={clickTab}
      >
        <TabInner id="tab-inner" style={{ margin: `0 0 0 ${innerMargin}px` }}>
          <FavTitle style={{ width: favTitleWidth }}>
            {faviconDisabled ? (
              ''
            ) : (
              // <FavImage src={World} />
              <FaviconAndFallback />
            )}
            <Title
              style={{
                // width: ,
                width: titleWidth,
                left: faviconDisabled ? '0' : '22px',
              }}
            >
              {title}
            </Title>
          </FavTitle>
          {closeEnabled ? <CloseButton /> : ''}
        </TabInner>
        <Divider id="divider" />
      </TabParent>
    );
  }
);
