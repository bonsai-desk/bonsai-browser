import React, { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import styled from 'styled-components';
import { ipcRenderer } from 'electron';
import { Refresh, ArrowForward, ArrowBack } from '@material-ui/icons';
import copyIcon from '../../assets/copy.svg';
import backParent from '../../assets/back-parent.svg';
import { useStore } from '../store/tab-page-store';
import { Buttons } from '../components/Buttons';
import { goForward } from '../store/history-store';

const TitleBarFull = styled.div`
  font-family: sans-serif;
`;

const TitleBarBottom = styled.div`
  width: calc(100% - 20px);
  height: 36px;
  background-color: white;
  border-bottom: 1px solid #dee1e6;
  display: flex;
  align-items: center;
  align-content: center;
  //padding-left: 4px;
  //padding-right: 5px;
  overflow: hidden;
  padding: 0 10px 0 10px;
`;

const SquareButton = styled.div`
  -webkit-app-region: no-drag;
  user-select: none;
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 10px;
  color: white;

  transition-duration: 0.1s;
  background-color: rgba(0, 0, 0, 0.25);
  :active {
    background-color: rgba(0, 0, 0, 0.5);
  }
`;

const RoundButton = styled(Buttons)`
  border-radius: 50%;
  height: 28px;
  width: 28px;
  padding: 0 8px;
  svg {
    font-size: 20px;
  }
`;

const RoundButtonIcon = styled.img`
  -webkit-user-drag: none;
  width: 20px;
`;

const URLBox = styled.input`
  flex-grow: 1;
  border-radius: 10px;
  outline: none;
  border: 2px solid rgba(0, 0, 0, 0.25);
  padding-left: 10px;
  height: 22px;
  margin: 0 10px 0 10px;
`;

const ButtonRow = styled.div`
  display: grid;
  grid-auto-flow: column;
  grid-gap: 4px;
  justify-content: flex-start;
`;

const TitleBar = observer(() => {
  const { tabStore, historyStore } = useStore();

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
            onClick={() => {
              ipcRenderer.send('go-back-from-floating');
            }}
          >
            <ArrowBack />
          </RoundButton>
          <RoundButton
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
          placeholder="Search Google or type a URL"
          value={tabStore.getActiveTabSearchBar()}
          onInput={(e) => {
            // if (tabStore.activeTabId === -1) {
            //   TabStore.requestAddTab();
            // }
            tabStore.setActiveTabSearchBar(e.currentTarget.value);
          }}
          onKeyDown={(e) => {
            if (e.nativeEvent.code === 'Enter') {
              const searchText = tabStore.getActiveTabSearchBar();
              if (searchText !== '') {
                ipcRenderer.send('load-url-in-tab', [
                  tabStore.activeTabId,
                  searchText,
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
          onBlur={() => {
            setUrlFocus(false);
            if (urlBoxRef.current != null) {
              urlBoxRef.current.blur();
              window.getSelection()?.removeAllRanges();
            }
          }}
        />
        <SquareButton
          onClick={() => {
            ipcRenderer.send('float');
            ipcRenderer.send('mixpanel-track', 'click float window button');
          }}
        >
          <RoundButtonIcon src={copyIcon} />
        </SquareButton>
        <div style={{ height: '100%', width: '10px' }} />
        <SquareButton
          onClick={() => {
            ipcRenderer.send('sleep-and-back');
            ipcRenderer.send('mixpanel-track', 'click sleep and back');
          }}
        >
          <RoundButtonIcon src={backParent} />
        </SquareButton>
      </TitleBarBottom>
    </TitleBarFull>
  );
});

export default TitleBar;
