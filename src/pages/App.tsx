import React, { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import styled from 'styled-components';
import { ipcRenderer } from 'electron';
import {
  Refresh,
  ArrowForward,
  ArrowBack,
  PictureInPicture,
} from '@material-ui/icons';
import { runInAction } from 'mobx';
import { useStore } from '../store/tab-page-store';
import { Buttons } from '../components/Buttons';
import { goForward } from '../store/history-store';

const TitleBarFull = styled.div`
  font-family: sans-serif;
  //background-color: white;
`;

const TitleBarBottom = styled.div`
  width: calc(100% - 20px);
  height: 36px;
  background-color: var(--canvas-color);
  border-bottom: 1px solid #dee1e6;
  display: flex;
  align-items: center;
  align-content: center;
  //padding-left: 4px;
  //padding-right: 5px;
  overflow: hidden;
  padding: 0 10px 0 10px;
`;

export const RoundButton = styled(Buttons)`
  border-radius: 50%;
  height: 28px;
  width: 28px;
  padding: 0 8px;
  svg {
    font-size: 20px;
  }
`;

const URLBox = styled.input`
  flex-grow: 1;
  height: 28px;
  border-radius: 99999px;
  border: none;
  background-color: var(--search-color);
  padding: 0 0 0 10px;
  outline: none;
  :focus {
    color: black;
    outline: var(--link-color) solid 2px;
    background-color: white;
  }
  margin: 0 10px 0 8px;
  color: var(--body-text-color);
`;

const ButtonRow = styled.div`
  display: grid;
  grid-auto-flow: column;
  grid-gap: 4px;
  justify-content: flex-start;
`;

const TitleBar = observer(() => {
  const { tabStore, historyStore, tabPageStore, keybindStore } = useStore();

  const urlBoxRef = useRef<HTMLInputElement>(null);

  const [hasRunOnce, setHasRunOnce] = useState(false);
  const [urlFocus, setUrlFocus] = useState(false);

  useEffect(() => {
    if (hasRunOnce) {
      return;
    }
    setHasRunOnce(true);
    ipcRenderer.on('tabView-created-with-id', () => {
      if (urlBoxRef.current != null) {
        urlBoxRef.current.focus();
      }
    });
    ipcRenderer.on('focus', () => {
      if (urlBoxRef.current != null) {
        urlBoxRef.current.focus();
        urlBoxRef.current.select();
      }
    });
  }, [hasRunOnce]);

  return (
    <TitleBarFull>
      <TitleBarBottom>
        <ButtonRow>
          <RoundButton
            className="is-lowkey"
            disabled={
              !tabPageStore.tabCanGoBack(tabStore.activeTabId.toString())
            }
            onClick={() => {
              ipcRenderer.send('go-back-from-floating');
            }}
          >
            <ArrowBack />
          </RoundButton>
          <RoundButton
            className="is-lowkey"
            disabled={
              !tabPageStore.tabCanGoForward(tabStore.activeTabId.toString())
            }
            onClick={() => {
              goForward(historyStore);
            }}
          >
            <ArrowForward />
          </RoundButton>
          <RoundButton
            onClick={() => {
              ipcRenderer.send('tab-refresh', tabStore.activeTabId);
            }}
          >
            <Refresh />
          </RoundButton>
        </ButtonRow>
        <URLBox
          type="text"
          ref={urlBoxRef}
          placeholder={`Search ${keybindStore.settings.selectedSearch} or type a URL`}
          value={tabStore.getActiveTabSearchBar()}
          onInput={(e) => {
            tabStore.setActiveTabSearchBar(e.currentTarget.value);
          }}
          onKeyDown={(e) => {
            if (e.nativeEvent.code === 'Enter') {
              const searchText = tabStore.getActiveTabSearchBar();
              if (searchText !== '') {
                ipcRenderer.send('load-text-in-tab', [
                  tabStore.activeTabId,
                  searchText,
                  keybindStore.searchString(),
                ]);
                ipcRenderer.send('mixpanel-track', 'search url from title bar');
              }
            }
          }}
          onClick={() => {
            if (urlBoxRef.current != null && !urlFocus) {
              setUrlFocus(true);
              urlBoxRef.current.select();
            }
          }}
          onFocus={() => {
            runInAction(() => {
              tabPageStore.urlBoxFocus = true;
            });
          }}
          onBlur={() => {
            setUrlFocus(false);
            runInAction(() => {
              tabPageStore.urlBoxFocus = false;
            });
            if (urlBoxRef.current != null) {
              urlBoxRef.current.blur();
              window.getSelection()?.removeAllRanges();
            }
          }}
        />
        <RoundButton
          onClick={() => {
            ipcRenderer.send('float');
            ipcRenderer.send('mixpanel-track', 'click float window button');
          }}
        >
          <PictureInPicture />
        </RoundButton>
      </TitleBarBottom>
    </TitleBarFull>
  );
});

export default TitleBar;
