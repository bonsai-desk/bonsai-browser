import React, { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import styled, { css } from 'styled-components';
import { ipcRenderer } from 'electron';
import { useStore } from '../utils/data';
import refreshIcon from '../../assets/refresh.svg';
import copyIcon from '../../assets/copy.svg';

const TitleBarFull = styled.div`
  width: 100vw;
  height: 100vh;
  font-family: sans-serif;
`;

const TitleBarBottom = styled.div`
  width: calc(100% - 4px - 5px);
  height: 36px;
  border-radius: 10px 10px 0 0;
  background-color: white;
  border-bottom: 1px solid #dee1e6;
  display: flex;
  align-items: center;
  align-content: center;
  padding-left: 4px;
  padding-right: 5px;
  overflow: hidden;
`;

interface StyledRoundButtonProps {
  color: string;
}

const RoundButton = styled.div`
  -webkit-app-region: no-drag;
  user-select: none;
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  margin-left: 2px;
  color: white;

  ${({ color }: StyledRoundButtonProps) =>
    css`
      background-color: ${color};
    `}
`;

const RoundButtonIcon = styled.img`
  -webkit-user-drag: none;
  width: 20px;
`;

const URLBox = styled.input`
  flex-grow: 1;
  margin-left: 10px;
  border-radius: 10000000px;
  outline: none;
  border: 2px solid black;
  padding-left: 10px;
  margin-right: 5px;
  height: 22px;
`;

const TitleBar = observer(() => {
  const { tabStore } = useStore();
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
        <RoundButton
          color="#949494"
          onClick={() => {
            ipcRenderer.send('tab-refresh', tabStore.activeTabId);
          }}
        >
          <RoundButtonIcon src={refreshIcon} />
        </RoundButton>
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
        <RoundButton
          color="#949494"
          onClick={() => {
            ipcRenderer.send('float');
          }}
        >
          <RoundButtonIcon src={copyIcon} />
        </RoundButton>
      </TitleBarBottom>
    </TitleBarFull>
  );
});

export default TitleBar;
