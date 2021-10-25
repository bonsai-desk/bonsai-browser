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
  z-index: 1;
  border-radius: 10px 10px 0 0;
  background-color: #d9dde2;
  width: 500px;
  position: absolute;
  top: 0;
  left: 0;
  height: 70px;
  border-bottom: 1px solid #dee1e6;
`;
export const TabParent = styled.div`
  position: relative;
  cursor: default !important;
  width: ${({ width }: { width: number }) => `${width}px`};
  padding: 0 0 0 13px;
  height: 35px;
  display: flex;
  flex-wrap: wrap;
  align-content: center;
  border-radius: 10px 10px 0 0;
  background-color: transparent;
  transition-duration: 0.1s;

  :hover {
    background-color: #eff1f3;

    #tab-inner {
      border-right: 1px solid transparent;
    }
  }

  &.is-active {
    background-color: white;

    :hover {
      background-color: white;
    }

    #tab-inner {
      border-right: 1px solid transparent;
    }
  }

  &:not(:first-child) {
    margin: 0 0 0 -1px;
  }
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
  width: 16px;
  margin: 0 6px 0 0;
  background-size: cover;
  background-repeat: no-repeat;
  background-position: center center;
  image-rendering: -webkit-optimize-contrast;
`;
export const TabInner = styled.div`
  width: calc(100%);
  padding: 0 8px 0 0;
  height: 19px;
  border-right: 1px solid #808387;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-content: center;
`;
export const FavTitle = styled.div`
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-content: center;
  font-size: 12px;
  width: calc(100% - 16px);
`;

const Title = styled.div`
  color: ${color('body-text-color')};
  height: 15px;
  margin: -1px 0 0 0;
  width: calc(100% - 22px);
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
  position: absolute;
  left: 22px;
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
      <TabButton
        onClick={(e) => {
          clickClose(e);
        }}
      >
        <Close />
      </TabButton>
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

    return (
      <TabParent
        ref={tabRef}
        width={width}
        className={active ? 'is-active' : ''}
        onClick={clickTab}
      >
        <TabInner id="tab-inner">
          <FavTitle>
            <Favicon
              style={{
                backgroundImage: `url(${tab.favicon})`,
              }}
            >
              {tab.favicon ? (
                ''
              ) : (
                <Public
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: '100%',
                    height: '100%',
                  }}
                />
              )}
            </Favicon>
            <Title>{title}</Title>
          </FavTitle>
          {!disableButtons ? <CloseButton /> : ''}
        </TabInner>
      </TabParent>
    );
  }
);
