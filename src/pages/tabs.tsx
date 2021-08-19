import React, { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';
import { ipcRenderer } from 'electron';
import '../tabPage.css';
import styled, { createGlobalStyle, css } from 'styled-components';
import { View, useStore } from '../store/tab-page-store';
import {
  ClearHistory,
  History,
  HistoryButton,
  HistoryHeader,
  HistoryModal,
  HistoryModalBackground,
  HistoryModalParent,
  HistoryResults,
  HistorySearch,
} from '../components/History';
import { URLBox, URLBoxParent } from '../components/TabPageHeader';
import {
  Background,
  Footer,
  TabColumns,
  Tab,
  FooterButton,
} from '../components/TabPageContent';
import Workspace from '../components/Workspace';
import pinSelected from '../../assets/pin-selected.svg';
import pinUnselected from '../../assets/pin-unselected.svg';
import { Direction, Platform, myPlatform } from '../render-constants';

const Clicker = styled.div`
  position: absolute;
  height: 100vh;
  width: 100vw;
`;

const Wrapper = styled.div`
  width: 100vw;
  height: 100vh;
`;

const GlobalStyle = createGlobalStyle`
  html,
  body {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    ${() => {
      if (myPlatform === Platform.Mac) {
        return css`
          @media (prefers-color-scheme: dark) {
            background-color: rgba(0, 0, 0, 0);
          }
          @media (prefers-color-scheme: light) {
            background-color: rgba(0, 0, 0, 0);
          }
        `;
      }
      return css`
        background-color: rgba(0, 0, 0, 0.7);
      `;
    }}}
  }
`;

const HistoryModalLocal = observer(() => {
  const { tabPageStore } = useStore();

  const historyBoxRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    tabPageStore.historyBoxRef = historyBoxRef;
  }, [tabPageStore]);

  useEffect(() => {
    const historyActive = tabPageStore.View === View.History;
    ipcRenderer.send('history-modal-active-update', historyActive);
    if (historyActive) {
      ipcRenderer.send('history-search', tabPageStore.historyText);
    }
  }, [tabPageStore.View, tabPageStore.historyText]);

  return (
    <HistoryModalParent active={tabPageStore.View === View.History}>
      <HistoryModalBackground
        onClick={() => {
          runInAction(() => {
            tabPageStore.View = View.Tabs;
          });
        }}
      />
      <HistoryModal>
        <HistoryHeader>
          <HistorySearch
            ref={historyBoxRef}
            placeholder="search history"
            value={tabPageStore.historyText}
            onInput={(e) => {
              tabPageStore.setHistoryText(e.currentTarget.value);
            }}
          />
          <ClearHistory
            type="button"
            onClick={() => {
              ipcRenderer.send('clear-history');
            }}
          >
            Clear History
          </ClearHistory>
        </HistoryHeader>
        <HistoryResults>
          <History />
        </HistoryResults>
      </HistoryModal>
    </HistoryModalParent>
  );
});

const FuzzyTabs = observer(() => {
  const { tabPageStore } = useStore();
  return (
    <div style={{ flexGrow: 1 }}>
      <h1>Today</h1>
      {tabPageStore.filteredTabs.map((result, idx) => {
        const { item } = result;
        return (
          <Tab
            key={item.id}
            tab={item}
            selected={idx === tabPageStore.fuzzySelection[0]}
            hover
          />
        );
      })}
    </div>
  );
});

const MainContent = observer(() => {
  const { tabPageStore } = useStore();
  const tabs = (
    <div style={{ height: '100%', padding: '0 0 0 1rem' }}>
      {tabPageStore.urlText.length === 0 ? <TabColumns /> : <FuzzyTabs />}
    </div>
  );

  const workspace = (
    <>
      <Clicker
        onClick={() => {
          tabPageStore.View = View.Tabs;
        }}
      />
      <Workspace />
    </>
  );

  if (tabPageStore.View === View.WorkSpace) {
    return workspace;
  }
  return tabs;
});

const PinButton = styled.button`
  border: none;
  outline: none;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  position: absolute;
  top: 10px;
  right: 10px;
  background-color: darkgray;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
`;

const Icon = styled.img`
  pointer-events: none;

  ${({ isPinned }: { isPinned: boolean }) =>
    css`
      width: ${isPinned ? '60' : '28'}px;
      height: ${isPinned ? '60' : '28'}px;
    `}
`;

const Content = observer(() => {
  const { tabPageStore } = useStore();

  const urlBoxRef = useRef<HTMLInputElement>(null);
  const [urlFocus, setUrlFocus] = useState(false);

  useEffect(() => {
    tabPageStore.urlBoxRef = urlBoxRef;
  });

  if (tabPageStore.View !== View.None) {
    return (
      <Background>
        <URLBoxParent>
          <URLBox
            type="text"
            spellCheck={false}
            ref={urlBoxRef}
            placeholder="Search Google or type a URL"
            value={tabPageStore.urlText}
            onInput={(e) => {
              tabPageStore.setUrlText(e.currentTarget.value);
            }}
            onKeyDown={(e) => {
              if (e.nativeEvent.code === 'Enter') {
                ipcRenderer.send('search-url', tabPageStore.urlText);
                tabPageStore.setUrlText('');
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
        </URLBoxParent>
        <MainContent />
        <Footer>
          <FooterButton
            onClick={() => {
              runInAction(() => {
                if (tabPageStore.View === View.Tabs) {
                  tabPageStore.View = View.WorkSpace;
                } else if (tabPageStore.View === View.WorkSpace) {
                  tabPageStore.View = View.Tabs;
                }
              });
            }}
          >
            Workspace
          </FooterButton>
          <HistoryButton
            type="button"
            onClick={() => {
              runInAction(() => {
                tabPageStore.View = View.History;
              });
            }}
          >
            History
          </HistoryButton>
        </Footer>
      </Background>
    );
  }

  return (
    <Clicker
      onClick={() => {
        ipcRenderer.send('click-main');
      }}
    />
  );
});

const Tabs = observer(() => {
  const { tabPageStore } = useStore();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      tabPageStore.handleKeyDown(e);
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [tabPageStore]);

  const [hasRunOnce, setHasRunOnce] = useState(false);

  useEffect(() => {
    if (hasRunOnce) {
      return;
    }
    setHasRunOnce(true);
  }, [hasRunOnce, tabPageStore]);

  return (
    <Wrapper>
      <GlobalStyle />
      <Content />
      <HistoryModalLocal />
      <PinButton
        onClick={() => {
          ipcRenderer.send('toggle-pin');
        }}
      >
        <Icon
          src={tabPageStore.isPinned ? pinSelected : pinUnselected}
          isPinned={tabPageStore.isPinned}
        />
      </PinButton>
    </Wrapper>
  );
});

export default Tabs;
