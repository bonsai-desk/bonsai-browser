import React, { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';
import { ipcRenderer } from 'electron';
import '../tabPage.css';
import redX from '../static/x-letter.svg';
import TabPageStore, { useStore } from '../store/tab-page-store';
import {
  ClearHistory,
  HistoryButton,
  HistoryHeader,
  HistoryModal,
  HistoryModalBackground,
  HistoryModalParent,
  HistoryResult,
  HistoryResults,
  HistorySearch,
  HistoryTitleDiv,
  HistoryUrlDiv,
} from '../components/History';
import { URLBox, URLBoxParent } from '../components/TabPageHeader';
import {
  Background,
  Column,
  ColumnHeader,
  Favicon,
  Footer,
  RedX,
  RedXParent,
  TabColumnsParent,
  TabImage,
  TabImageParent,
  TabParent,
  TabTitle,
  WorkspaceButton,
} from '../components/TabPageContent';
import { ITab, TabPageColumn, TabPageTab } from '../interfaces/tab';

import { getRootDomain } from '../utils/data';

function Tab({ title, imgUrl, tab }: ITab) {
  return (
    <TabParent
      onClick={() => {
        ipcRenderer.send('set-tab', tab.id);
      }}
    >
      <TabImageParent>
        <TabImage src={imgUrl} alt="tab_image" />
        <RedXParent>
          <TabTitle>{title === '' ? 'New Tab' : title}</TabTitle>
          <RedX
            id="RedX"
            onClick={(e) => {
              e.stopPropagation();
              ipcRenderer.send('remove-tab', tab.id);
            }}
          >
            <img src={redX} alt="x" width="20px" />
          </RedX>
        </RedXParent>
      </TabImageParent>
    </TabParent>
  );
}

const TabColumns = observer(
  ({ tabPageStore }: { tabPageStore: TabPageStore }) => {
    const columns: Record<string, TabPageTab[]> = {};

    Object.values(tabPageStore.tabs).forEach((tab) => {
      const domain = getRootDomain(tab.url);
      if (!columns[domain]) {
        columns[domain] = [];
      }
      columns[domain].unshift(tab);
    });

    const tabPageColumns: TabPageColumn[] = [];

    Object.keys(columns).forEach((key) => {
      const column: TabPageColumn = { domain: key, tabs: columns[key] };
      tabPageColumns.push(column);
    });

    return (
      <>
        {tabPageColumns.map((column) => {
          // let columnFavicon = '';
          // if (column.tabs.length > 0) {
          //   columnFavicon = column.tabs[0].favicon;
          // }

          // {/*<Favicon src={columnFavicon} />*/}

          return (
            <Column key={column.domain}>
              <div style={{ width: '100%', display: 'flex' }}>
                <ColumnHeader>{column.domain}</ColumnHeader>
              </div>
              {column.tabs.map((tab) => {
                const imgUrl =
                  tab.openGraphInfo !== null && tab.openGraphInfo.image !== ''
                    ? tab.openGraphInfo.image
                    : tab.image;
                const title =
                  tab.openGraphInfo !== null &&
                  tab.openGraphInfo.title !== '' &&
                  tab.openGraphInfo.title !== 'null'
                    ? tab.openGraphInfo.title
                    : tab.title;
                return (
                  <Tab key={tab.id} tab={tab} title={title} imgUrl={imgUrl} />
                );
              })}
            </Column>
          );
        })}
      </>
    );
  }
);

export function getHistory(tabPageStore: TabPageStore) {
  let results;
  if (tabPageStore.searchResult === null) {
    results = Array.from(tabPageStore.historyMap.values()).map(
      (_, index, array) => {
        return array[array.length - 1 - index];
      }
    );
  } else {
    results = tabPageStore.searchResult;
  }

  return results.map((entry) => {
    return (
      <HistoryResult
        key={entry.key}
        onClick={() => {
          ipcRenderer.send('search-url', entry.url);
        }}
      >
        <Favicon src={entry.favicon} />
        <HistoryTitleDiv>{entry.title}</HistoryTitleDiv>
        <HistoryUrlDiv>{entry.url}</HistoryUrlDiv>
      </HistoryResult>
    );
  });
}

const TabPage = observer(() => {
  const { tabPageStore } = useStore();
  const urlBoxRef = useRef<HTMLInputElement>(null);
  const [urlFocus, setUrlFocus] = useState(false);
  const [urlText, setUrlText] = useState('');

  const historyBoxRef = useRef<HTMLInputElement>(null);
  const [historyText, setHistoryText] = useState('');

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case 'Enter':
          break;
        case 'Escape':
          break;
        default:
          // when you start typing, move the cursor to textbox
          if (tabPageStore.historyModalActive) {
            historyBoxRef.current?.focus();
          } else {
            urlBoxRef.current?.focus();
          }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    ipcRenderer.send(
      'history-modal-active-update',
      tabPageStore.historyModalActive
    );
    if (tabPageStore.historyModalActive) {
      ipcRenderer.send('history-search', historyText);
    }
  }, [tabPageStore.historyModalActive, historyText]);

  const [hasRunOnce, setHasRunOnce] = useState(false);

  useEffect(() => {
    if (hasRunOnce) {
      return;
    }
    setHasRunOnce(true);
    ipcRenderer.on('focus-search', () => {
      if (urlBoxRef.current != null) {
        urlBoxRef.current.select();
      }
    });
  }, [hasRunOnce]);

  return (
    <>
      <Background>
        <URLBoxParent>
          <URLBox
            type="text"
            spellCheck={false}
            ref={urlBoxRef}
            placeholder="Search Google or type a URL"
            value={urlText}
            onInput={(e) => {
              setUrlText(e.currentTarget.value);
            }}
            onKeyDown={(e) => {
              if (e.nativeEvent.code === 'Enter') {
                setUrlText('');
                ipcRenderer.send('search-url', urlText);
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
        <TabColumnsParent>
          <TabColumns tabPageStore={tabPageStore} />
        </TabColumnsParent>
        <Footer>
          <WorkspaceButton>Workspace</WorkspaceButton>
          <HistoryButton
            type="button"
            onClick={() => {
              runInAction(() => {
                tabPageStore.historyModalActive = !tabPageStore.historyModalActive;
              });
            }}
          >
            History
          </HistoryButton>
        </Footer>
      </Background>
      <HistoryModalParent active={tabPageStore.historyModalActive}>
        <HistoryModalBackground
          onClick={() => {
            runInAction(() => {
              tabPageStore.historyModalActive = false;
            });
          }}
        />
        <HistoryModal>
          <HistoryHeader>
            <HistorySearch
              ref={historyBoxRef}
              placeholder="search history"
              value={historyText}
              onInput={(e) => {
                setHistoryText(e.currentTarget.value);
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
          <HistoryResults>{getHistory(tabPageStore)}</HistoryResults>
        </HistoryModal>
      </HistoryModalParent>
    </>
  );
});

export default TabPage;
