import { makeAutoObservable, runInAction } from 'mobx';
import { ipcRenderer } from 'electron';
import { createContext, useContext } from 'react';
import Fuse from 'fuse.js';
import { Instance } from 'mobx-state-tree';
import { TabPageColumn, TabPageTab } from '../interfaces/tab';
import { HistoryEntry } from '../utils/tab-view';
import { getRootDomain } from '../utils/data';
import { WorkspaceStore } from './workspace-store';

export default class TabPageStore {
  tabs: Record<string, TabPageTab> = {};

  filteredTabs: Fuse.FuseResult<TabPageTab>[];

  historyMap = new Map<string, HistoryEntry>();

  searchResult: HistoryEntry[] | null = null;

  historyModalActive = false;

  urlText = '';

  historyText = '';

  urlInput: HTMLInputElement | null;

  historyInput: HTMLInputElement | null;

  workspaceActive = false;

  tabPageColumns() {
    const columns: Record<string, TabPageTab[]> = {};
    Object.values(this.tabs).forEach((tab) => {
      const domain = getRootDomain(tab.url);
      if (!columns[domain]) {
        columns[domain] = [];
      }
      columns[domain].unshift(tab);
    });
    return Object.keys(columns).map((key) => {
      const column: TabPageColumn = { domain: key, tabs: columns[key] };
      return column;
    });
  }

  setFocus() {
    if (this.historyModalActive) {
      this.historyInput?.focus();
    } else {
      this.urlInput?.focus();
    }
  }

  selectText() {
    if (this.historyModalActive) {
      this.historyInput?.select();
    } else {
      this.urlInput?.select();
    }
  }

  searchTab(pattern: string) {
    const tabFuse = new Fuse<TabPageTab>(Object.values(this.tabs), {
      keys: ['title', 'openGraphData.title'],
    });
    this.filteredTabs = tabFuse.search(pattern);
  }

  setUrlText(newValue: string) {
    this.urlText = newValue;
    this.searchTab(newValue);
  }

  refreshFuse() {
    const tabFuse = new Fuse<TabPageTab>(Object.values(this.tabs), {
      keys: ['title', 'openGraphData.title'],
    });
    this.filteredTabs = tabFuse.search(this.urlText);
  }

  setHistoryText(newValue: string) {
    this.historyText = newValue;
  }

  setHistoryActive(active: boolean) {
    this.historyModalActive = active;
  }

  constructor() {
    makeAutoObservable(this);

    this.filteredTabs = [];
    this.urlInput = null;
    this.historyInput = null;
    //

    ipcRenderer.on('tabView-created-with-id', (_, id) => {
      runInAction(() => {
        this.tabs[id] = {
          id,
          lastAccessTime: new Date().getTime(),
          url: '',
          title: '',
          image: '',
          favicon: '',
          openGraphInfo: null,
        };
      });
    });
    ipcRenderer.on('tab-removed', (_, id) => {
      runInAction(() => {
        delete this.tabs[id];
        // todo: could filter the fuse instead if it was a property
        this.refreshFuse();
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
        if (entry.openGraphData.title !== 'null') {
          Object.values(this.tabs).forEach((tab) => {
            if (tab.url === entry.url) {
              tab.openGraphInfo = entry.openGraphData;
            }
          });
        }
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
    ipcRenderer.on('blur', () => {
      runInAction(() => {
        this.setUrlText('');
      });
    });
  }
}

interface IContext {
  tabPageStore: TabPageStore;
  workspaceStore: Instance<typeof WorkspaceStore>;
}
const TabPageContext = createContext<null | IContext>(null);
export const { Provider } = TabPageContext;
export function useStore() {
  const store = useContext(TabPageContext);
  if (store === null) {
    throw new Error('Please add provider.');
  }
  return store;
}

export const tabPageStore = new TabPageStore();
