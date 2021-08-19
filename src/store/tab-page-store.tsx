import { makeAutoObservable, runInAction } from 'mobx';
import { ipcRenderer } from 'electron';
import { RefObject, createContext, useContext } from 'react';
import Fuse from 'fuse.js';
import { Instance } from 'mobx-state-tree';
import { TabPageColumn, TabPageTab } from '../interfaces/tab';
import { HistoryEntry } from '../utils/tab-view';
import { getRootDomain } from '../utils/data';
import { WorkspaceStore } from './workspace-store';
import { Direction } from '../render-constants';

export enum View {
  None,
  WorkSpace,
  Tabs,
  FuzzySearch,
  History,
}

export default class TabPageStore {
  private view: View = View.Tabs;

  public get View() {
    return this.view;
  }

  public set View(view: View) {
    this.view = view;
  }

  tabs: Record<string, TabPageTab> = {};

  filteredTabs: Fuse.FuseResult<TabPageTab>[];

  historyMap = new Map<string, HistoryEntry>();

  searchResult: HistoryEntry[] | null = null;

  urlText = '';

  historyText = '';

  padding = '35';

  isPinned = false;

  urlBoxRef: RefObject<HTMLInputElement> | null = null;

  historyBoxRef: RefObject<HTMLInputElement> | null = null;

  activeGroupBoxRef: RefObject<HTMLInputElement> | null = null;

  editingGroupId = '';

  fuzzySelection: [number, number] = [0, 0];

  moveFuzzySelection(direction: Direction) {
    const sel = this.fuzzySelection;
    switch (direction) {
      case Direction.Down:
        this.fuzzySelection = [sel[0] + 1, sel[1]];
        break;
      case Direction.Up:
        this.fuzzySelection = [sel[0] - 1, sel[1]];
        break;
      case Direction.Left:
        this.fuzzySelection = [sel[0], sel[1] - 1];
        break;
      case Direction.Right:
        this.fuzzySelection = [sel[0], sel[1] + 1];
        break;
      default:
        break;
    }
    this.fuzzySelection = [
      Math.max(-1, this.fuzzySelection[0]),
      Math.max(0, this.fuzzySelection[1]),
    ];
  }

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
    if (this.activeGroupBoxRef !== null) {
      this.activeGroupBoxRef.current?.focus();
      return;
    }
    switch (this.view) {
      case View.History:
        this.historyBoxRef?.current?.focus();
        break;
      default:
        this.urlBoxRef?.current?.focus();
    }
  }

  selectText() {
    if (this.activeGroupBoxRef !== null) {
      this.activeGroupBoxRef.current?.select();
      return;
    }
    switch (this.view) {
      case View.History:
        this.historyBoxRef?.current?.select();
        break;
      default:
        this.urlBoxRef?.current?.select();
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

  constructor() {
    makeAutoObservable(this);

    this.filteredTabs = [];
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
    ipcRenderer.on('tab-image-native', (_, [id, thing]) => {
      runInAction(() => {
        if (typeof this.tabs[id] !== 'undefined') {
          this.tabs[id].image = thing;
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
        this.View = View.Tabs;
      });
    });
    ipcRenderer.on('open-history-modal', () => {
      runInAction(() => {
        this.View = View.History;
      });
    });
    ipcRenderer.on('toggle-history-modal', () => {
      runInAction(() => {
        if (this.View !== View.History) {
          this.View = View.History;
        } else {
          this.View = View.Tabs;
        }
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
    ipcRenderer.on('set-padding', (_, newPadding) => {
      runInAction(() => {
        this.padding = newPadding;
      });
    });
    ipcRenderer.on('set-active', (_, newIsActive) => {
      runInAction(() => {
        if (newIsActive) {
          this.View = View.Tabs;
        } else {
          this.View = View.None;
        }
      });
    });
    ipcRenderer.on('focus-search', () => {
      this.setFocus();
      this.selectText();
    });
    ipcRenderer.on('set-pinned', (_, newIsPinned) => {
      runInAction(() => {
        this.isPinned = newIsPinned;
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
