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

  openTabs: Record<string, TabPageTab> = {};

  filteredOpenTabs: Fuse.FuseResult<TabPageTab>[];

  filteredWorkspaceTabs: Fuse.FuseResult<TabPageTab>[];

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

  fuzzySelectionIndex: [number, number] = [0, 0];

  fuzzySelectedTab(): TabPageTab | null {
    const tab = this.filteredOpenTabs[this.fuzzySelectionIndex[0]];
    if (typeof tab !== 'undefined') {
      return tab.item;
    }
    return null;
  }

  handleKeyDown(e: KeyboardEvent) {
    switch (e.key) {
      case 'Enter':
        if (this.View === View.FuzzySearch) {
          const tab = this.fuzzySelectedTab();
          if (tab) {
            ipcRenderer.send('set-tab', tab.id);
          } else {
            ipcRenderer.send('search-url', this.urlText);
          }
          this.setUrlText('');
        }
        break;
      case 'Escape':
        if (this.View === View.History) {
          this.View = View.Tabs;
        } else if (this.View === View.WorkSpace) {
          this.View = View.Tabs;
        } else if (this.urlText.length > 0) {
          this.setUrlText('');
        } else {
          ipcRenderer.send('toggle');
        }
        break;
      case 'Tab':
        if (this.View === View.Tabs) {
          this.View = View.WorkSpace;
        } else if (this.View === View.WorkSpace) {
          this.View = View.Tabs;
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.moveFuzzySelection(Direction.Up);
        break;
      case 'ArrowDown':
        e.preventDefault();
        this.moveFuzzySelection(Direction.Down);
        break;
      case 'ArrowLeft':
        if (this.fuzzySelectionIndex[0] > -1) {
          e.preventDefault();
          this.moveFuzzySelection(Direction.Left);
        }
        break;
      case 'ArrowRight':
        if (this.fuzzySelectionIndex[0] > -1) {
          e.preventDefault();
          this.moveFuzzySelection(Direction.Right);
        }
        break;
      default:
        this.setFocus();
        this.fuzzySelectionIndex = [-1, -1];
        break;
    }
  }

  moveFuzzySelection(direction: Direction) {
    const sel = this.fuzzySelectionIndex;
    switch (direction) {
      case Direction.Down:
        this.fuzzySelectionIndex = [sel[0] + 1, sel[1]];
        break;
      case Direction.Up:
        this.fuzzySelectionIndex = [sel[0] - 1, sel[1]];
        break;
      case Direction.Left:
        this.fuzzySelectionIndex = [sel[0], sel[1] - 1];
        break;
      case Direction.Right:
        this.fuzzySelectionIndex = [sel[0], sel[1] + 1];
        break;
      default:
        break;
    }
    this.fuzzySelectionIndex = [
      Math.max(-1, this.fuzzySelectionIndex[0]),
      Math.max(0, this.fuzzySelectionIndex[1]),
    ];
  }

  tabPageColumns() {
    const columns: Record<string, TabPageTab[]> = {};
    Object.values(this.openTabs).forEach((tab) => {
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
    const openTabFuse = new Fuse<TabPageTab>(Object.values(this.openTabs), {
      keys: ['title', 'openGraphData.title'],
    });
    const workspaceTabFuse = new Fuse<TabPageTab>(
      Object.values(this.openTabs),
      {
        keys: ['title', 'openGraphData.title'],
      }
    );
    // todo: workspace tab fuse
    this.filteredOpenTabs = openTabFuse.search(pattern);
    this.filteredWorkspaceTabs = workspaceTabFuse.search(pattern);
  }

  setUrlText(newValue: string) {
    this.urlText = newValue;
    if (newValue.length > 0) {
      this.View = View.FuzzySearch;
      this.searchTab(newValue);
    } else {
      this.View = View.Tabs;
    }
  }

  refreshFuse() {
    this.searchTab(this.urlText);
  }

  setHistoryText(newValue: string) {
    this.historyText = newValue;
  }

  constructor(workSpaceStore: Instance<typeof WorkspaceStore>) {
    makeAutoObservable(this);

    this.filteredOpenTabs = [];
    this.filteredWorkspaceTabs = [];
    //

    ipcRenderer.on('tabView-created-with-id', (_, id) => {
      runInAction(() => {
        this.openTabs[id] = {
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
        delete this.openTabs[id];
        // todo: could filter the fuse instead if it was a property
        this.refreshFuse();
      });
    });
    ipcRenderer.on('url-changed', (_, [id, url]) => {
      runInAction(() => {
        this.openTabs[id].url = url;
      });
    });
    ipcRenderer.on('title-updated', (_, [id, title]) => {
      runInAction(() => {
        this.openTabs[id].title = title;
      });
    });
    ipcRenderer.on('access-tab', (_, id) => {
      runInAction(() => {
        this.openTabs[id].lastAccessTime = new Date().getTime();
      });
    });
    ipcRenderer.on('tab-image-native', (_, [id, thing]) => {
      runInAction(() => {
        if (typeof this.openTabs[id] !== 'undefined') {
          this.openTabs[id].image = thing;
        }
      });
    });
    ipcRenderer.on('add-history', (_, entry: HistoryEntry) => {
      runInAction(() => {
        if (entry.openGraphData.title !== 'null') {
          Object.values(this.openTabs).forEach((tab) => {
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
        this.openTabs[id].favicon = favicon;
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
        if (this.View === View.Tabs) {
          this.setUrlText('');
        }
      });
    });
    ipcRenderer.on('set-padding', (_, newPadding) => {
      runInAction(() => {
        this.padding = newPadding;
      });
    });
    ipcRenderer.on('set-active', (_, newIsActive) => {
      runInAction(() => {
        if (newIsActive && this.View !== View.None) {
          return;
        }
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
