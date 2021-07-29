import React, { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import styled, { createGlobalStyle, css } from 'styled-components';
import { makeAutoObservable, runInAction } from 'mobx';
import { ipcRenderer } from 'electron';
import { HistoryEntry } from '../utils/tab-view';

const GlobalStyle = createGlobalStyle`
  html,
  body {
    margin: 0;
    padding: 0;
    width: 100vw;
    height: 100vh;
    font-family: sans-serif;
  }
`;

const Background = styled.div`
  background-color: gray;
  width: 100vw;
  height: 100vh;
  border-radius: 25px;
`;

const Tabs = styled.div`
  display: flex;
  align-items: flex-start;
  //background-color: blue;
  //border: 2px solid black;
  padding-left: 25px;
`;

const Column = styled.div`
  display: flex;
  justify-content: center;
  flex-direction: column;
  align-items: center;
  user-select: none;
  background-color: darkgrey;
  padding: 5px 10px 5px 10px;
  border: 2px solid black;
  margin-right: 25px;
  border-radius: 25px;
  //overflow: scroll;
  //height: 500px;
`;

const Tab = styled.div`
  display: flex;
  flex-direction: column;
  //justify-content: center;
  align-items: center;
  flex-shrink: 0;
  width: 250px;
  height: 175px;
  background-color: lightgrey;
  border: 2px solid black;
  border-radius: 25px;
  padding: 5px 20px 5px 20px;
  word-wrap: break-word;
  text-overflow: ellipsis;
  overflow: hidden;
  margin-bottom: 5px;

  :hover {
    cursor: pointer;
  }
`;

const URLBox = styled.input`
  border-radius: 10000000px;
  outline: none;
  border: 2px solid black;
  height: 22px;
  padding: 2px 2px 2px 10px;
  margin: 10px;
  width: calc(100% - 2px - 10px - 4px - 20px);
`;

const ColumnHeader = styled.div`
  //background-color: yellow;
  text-align: center;
  font-weight: bold;
  font-size: 40px;
  margin-bottom: 10px;
`;

// const TabTitleParent = styled.div`
//   display: flex;
//   align-items: center;
//   justify-content: center;
// `;

const TabTitle = styled.div`
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
`;

const CloseTabButton = styled.button`
  width: 50px;
  height: 25px;
`;

const TabImage = styled.img`
  max-width: 100%;
  user-select: none;
  -webkit-user-drag: none;
`;

const CloseColumnButton = styled.button`
  flex-grow: 0;
  margin-bottom: 5px;
  width: 100px;
  height: 30px;
`;

const HistoryButton = styled.button`
  position: absolute;
  bottom: 0;
  right: 0;
  width: 100px;
  height: 100px;
  border-radius: 25px;
  border: 2px solid black;
  outline: none;
`;

const HistoryModalParent = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  width: 100vw;
  height: 100vh;

  ${({ active }: { active: boolean }) =>
    css`
      display: ${active ? 'block' : 'none'};
    `}
`;

const HistoryModalBackground = styled.div`
  background-color: rgba(0.25, 0.25, 0.25, 0.35);
  position: absolute;
  left: 0;
  top: 0;
  width: 100vw;
  height: 100vh;
`;

const HistoryModal = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  right: 0;
  margin: auto;
  width: 80vw;
  height: 80vh;
  background-color: lightgrey;
  border-radius: 25px;
  border: 2px solid black;
  box-shadow: 0 0 5px 0 rgba(0, 0, 0, 1);
  padding: 20px;
`;

const HistoryHeader = styled.div`
  width: 100%;
  height: 40px;
  display: flex;
  align-items: center;
  margin-bottom: 5px;
`;

const HistorySearch = styled.input`
  outline: none;
  padding: 5px 10px 5px 10px;
  border-radius: 10000px;
  border: 2px solid black;
  //width: calc(100% - 20px - 4px);
  flex-grow: 1;
`;

const ClearHistory = styled.button`
  width: 100px;
  height: 28px;
  border-radius: 1000000px;
  border: 2px solid black;
  outline: none;
  margin-left: 5px;
`;

const HistoryResult = styled.div`
  background-color: gray;
  //width: 500px;
  //height: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 50px;
  text-align: center;
  border-radius: 25px;
  margin-bottom: 5px;
  padding-left: 20px;
  user-select: none;
  display: flex;
  align-items: center;

  :hover {
    cursor: pointer;
  }
`;

const HistoryTitleDiv = styled.div`
  //background-color: red;
  line-height: 25px;
  margin: 10px;
  color: white;
`;

const HistoryUrlDiv = styled.div`
  //background-color: red;
  line-height: 25px;
  margin: 10px;
  color: lightgrey;
  font-size: 15px;
`;

const Favicon = styled.img`
  width: 16px;
  height: 16px;
`;

interface TabPageTab {
  id: number;

  lastAccessTime: number;

  url: string;

  title: string;

  image: string;

  favicon: string;
}

export class TabPageStore {
  tabs: Record<string, TabPageTab> = {};

  historyMap = new Map<string, HistoryEntry>();

  searchResult: HistoryEntry[] | null = null;

  historyModalActive = false;

  constructor() {
    makeAutoObservable(this);

    ipcRenderer.on('tabView-created-with-id', (_, id) => {
      runInAction(() => {
        this.tabs[id] = {
          id,
          lastAccessTime: new Date().getTime(),
          url: '',
          title: '',
          image: '',
          favicon: '',
        };
      });
    });
    ipcRenderer.on('tab-removed', (_, id) => {
      runInAction(() => {
        delete this.tabs[id];
      });
    });
    ipcRenderer.on('url-changed', (_, [id, url]) => {
      runInAction(() => {
        this.tabs[id].url = url;
      });
    });
    ipcRenderer.on('title-updated', (_, [id, title]) => {
      runInAction(() => {
        this.tabs[id].title = title;
      });
    });
    ipcRenderer.on('access-tab', (_, id) => {
      runInAction(() => {
        this.tabs[id].lastAccessTime = new Date().getTime();
      });
    });
    ipcRenderer.on('tab-image', (_, [id, image]) => {
      runInAction(() => {
        if (typeof this.tabs[id] !== 'undefined') {
          this.tabs[id].image = image;
        }
      });
    });
    ipcRenderer.on('add-history', (_, entry: HistoryEntry) => {
      runInAction(() => {
        this.historyMap.delete(entry.key);
        this.historyMap.set(entry.key, entry);
        const keys = this.historyMap.keys();
        let result = keys.next();
        while (!result.done) {
          if (this.historyMap.size <= 50) {
            break;
          }
          this.historyMap.delete(result.value);
          result = keys.next();
        }
      });
    });
    ipcRenderer.on('history-search-result', (_, result) => {
      runInAction(() => {
        this.searchResult = result;
      });
    });
    ipcRenderer.on('close-history-modal', () => {
      runInAction(() => {
        this.historyModalActive = false;
      });
    });
    ipcRenderer.on('open-history-modal', () => {
      runInAction(() => {
        this.historyModalActive = true;
      });
    });
    ipcRenderer.on('toggle-history-modal', () => {
      runInAction(() => {
        this.historyModalActive = !this.historyModalActive;
      });
    });
    ipcRenderer.on('favicon-updated', (_, [id, favicon]) => {
      runInAction(() => {
        this.tabs[id].favicon = favicon;
      });
    });
    ipcRenderer.on('history-cleared', () => {
      runInAction(() => {
        this.historyMap.clear();
        this.searchResult = [];
      });
    });
  }
}

function getHistory(tabPageStore: TabPageStore) {
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

function getRootDomain(url: string): string {
  let testUrl;
  try {
    const { hostname } = new URL(url);
    testUrl = `http://${hostname}`;
  } catch {
    testUrl = url;
  }

  const ex = /\w*\./g;
  const result = testUrl.matchAll(ex);
  if (result !== null) {
    const results = [...result];
    if (results.length > 0) {
      const r = results[results.length - 1][0];
      return r.substring(0, r.length - 1);
    }
  }
  return '';
}

interface TabPageColumn {
  domain: string;

  tabs: TabPageTab[];
}

function createTabs(tabPageStore: TabPageStore) {
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

  // tabPageColumns.forEach((column) => {
  //   column.tabs.sort((a: TabPageTab, b: TabPageTab): number => {
  //     return b.lastAccessTime - a.lastAccessTime;
  //   });
  // });
  //
  // tabPageColumns.sort((a: TabPageColumn, b: TabPageColumn): number => {
  //   if (b.tabs.length === a.tabs.length && b.tabs.length > 0) {
  //     return b.tabs[0].lastAccessTime - a.tabs[0].lastAccessTime;
  //   }
  //   return b.tabs.length - a.tabs.length;
  // });

  return tabPageColumns.map((column) => {
    let columnFavicon = '';
    if (column.tabs.length > 0) {
      columnFavicon = column.tabs[0].favicon;
    }

    return (
      <Column key={column.domain}>
        <Favicon src={columnFavicon} />
        <ColumnHeader>{column.domain}</ColumnHeader>
        <CloseColumnButton
          type="button"
          onClick={() => {
            const ids: number[] = [];
            Object.keys(tabPageStore.tabs).forEach((key: string) => {
              const tab = tabPageStore.tabs[key];
              if (getRootDomain(tab.url) === column.domain) {
                ids.push(tab.id);
              }
            });
            ipcRenderer.send('remove-tabs', ids);
          }}
        >
          X
        </CloseColumnButton>
        {column.tabs.map((tab) => {
          return (
            <Tab
              key={tab.id}
              onClick={() => {
                ipcRenderer.send('set-tab', tab.id);
              }}
            >
              <TabTitle>{tab.url === '' ? 'New Tab' : tab.title}</TabTitle>
              <CloseTabButton
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  ipcRenderer.send('remove-tab', tab.id);
                }}
              >
                X
              </CloseTabButton>
              <TabImage src={tab.image} alt="tab_image" />
            </Tab>
          );
        })}
      </Column>
    );
  });
}

const TabPage = observer(({ tabPageStore }: { tabPageStore: TabPageStore }) => {
  const urlBoxRef = useRef<HTMLInputElement>(null);
  const [urlFocus, setUrlFocus] = useState(false);
  const [urlText, setUrlText] = useState('');

  const historyBoxRef = useRef<HTMLInputElement>(null);
  const [historyText, setHistoryText] = useState('');
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
      <GlobalStyle />
      <Background>
        <URLBox
          type="text"
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
        <Tabs>{createTabs(tabPageStore)}</Tabs>
      </Background>
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
          {getHistory(tabPageStore)}
        </HistoryModal>
      </HistoryModalParent>
    </>
  );
});

export default TabPage;
