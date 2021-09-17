import { makeAutoObservable, runInAction } from 'mobx';
import { ipcRenderer, Rectangle } from 'electron';
import { RefObject, createContext, useContext } from 'react';
import Fuse from 'fuse.js';
import { Instance } from 'mobx-state-tree';
import { TabPageColumn, TabPageTab } from '../interfaces/tab';
import { getRootDomain } from '../utils/data';
import { Item } from './workspace/item';
import { Direction } from '../render-constants';
import { chord, clamp } from '../utils/utils';
import { HistoryEntry } from '../utils/interfaces';
import { HistoryStore } from './history-store';
import WorkspaceStore from './workspace/workspace-store';
import packageInfo from '../package.json';
import { KeybindStore } from './keybinds';

export enum View {
  None,
  WorkSpace,
  Tabs,
  FuzzySearch,
  History,
  Navigator,
  NavigatorDebug,
  Settings,
}

export default class TabPageStore {
  private view: View = View.Tabs;

  public get View() {
    return this.view;
  }

  public set View(view: View) {
    if (view === View.Tabs && this.view !== View.Tabs) {
      this.hoveringUrlInput = true;
    }
    this.view = view;
    if (this.activeGroupBoxRef !== null) {
      this.activeGroupBoxRef.current?.blur();
      this.activeGroupBoxRef = null;
    }
    if (this.activeWorkspaceNameRef !== null) {
      this.activeWorkspaceNameRef.current?.blur();
      this.activeWorkspaceNameRef = null;
    }
    if (view !== View.FuzzySearch) {
      this.urlText = '';
    }
  }

  workAreaRect: Rectangle;

  navigatorTabModal = [0, 0];

  navigatorTabModalSelectedNodeId = '';

  hoveringUrlInput = false;

  openTabs: Record<string, TabPageTab> = {};

  filteredOpenTabs: Fuse.FuseResult<TabPageTab>[];

  filteredWorkspaceTabs: Fuse.FuseResult<Instance<typeof Item>>[];

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

  activeWorkspaceNameRef: RefObject<HTMLInputElement> | null = null;

  fuzzySelectionIndex: [number, number] = [0, 0];

  screen: { width: number; height: number };

  innerBounds: { x: number; y: number; width: number; height: number };

  private workspaceStore: Instance<typeof WorkspaceStore>;

  windowFloating = false;

  versionString = 'None';

  keys = '';

  bindKeys: string[] = [];

  rebindModalId = '';

  fuzzySelectedTab(): [boolean, TabPageTab | Instance<typeof Item>] | null {
    if (this.fuzzySelectionIndex[1] === 0) {
      const tab = this.filteredOpenTabs[this.fuzzySelectionIndex[0]];
      if (typeof tab !== 'undefined') {
        return [true, tab.item];
      }
    } else {
      const tab = this.filteredWorkspaceTabs[this.fuzzySelectionIndex[0]];
      if (typeof tab !== 'undefined') {
        return [false, tab.item];
      }
    }
    return null;
  }

  handleKeyDown(e: KeyboardEvent) {
    if (this.View === View.Settings && this.rebindModalId) {
      e.preventDefault();
      this.bindKeys = chord(e);
      ipcRenderer.send('rebind-hotkey', {
        hotkeyId: 'test',
        newBind: [...this.bindKeys],
      });
      return;
    }

    switch (e.key) {
      case 'Enter':
        if (this.View === View.FuzzySearch) {
          const data = this.fuzzySelectedTab();
          if (data) {
            const [open, tab] = data;
            if (open) {
              ipcRenderer.send('mixpanel-track', 'fuzzy enter set tab');
              ipcRenderer.send('set-tab', tab.id);
            } else {
              ipcRenderer.send(
                'mixpanel-track',
                'fuzzy enter open workspace tab'
              );
              ipcRenderer.send('open-workspace-url', tab.url);
            }
          } else {
            ipcRenderer.send('search-url', this.urlText);
            ipcRenderer.send('mixpanel-track', 'search url from home');
          }
          this.setUrlText('');
        }
        break;
      case 'Escape':
        if (
          this.View === View.History ||
          this.View === View.WorkSpace ||
          this.View === View.Settings ||
          this.View === View.NavigatorDebug
        ) {
          this.View = View.Tabs;
        } else if (this.urlText.length > 0) {
          this.setUrlText('');
        } else {
          ipcRenderer.send('toggle');
        }
        break;
      case 'Tab':
        if (this.View === View.Tabs) {
          ipcRenderer.send(
            'mixpanel-track',
            'toggle on workspace with tab key'
          );
          this.View = View.WorkSpace;
        } else if (this.View === View.WorkSpace) {
          ipcRenderer.send(
            'mixpanel-track',
            'toggle off workspace with tab key'
          );
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
        if (this.view !== View.Settings) {
          this.setFocus();
          this.fuzzySelectionIndex = [-1, -1];
        }
        break;
    }
  }

  moveFuzzySelection(direction: Direction) {
    const sel = this.fuzzySelectionIndex;

    const openNum = this.filteredOpenTabs.length;
    const workNum = this.filteredWorkspaceTabs.length;

    switch (direction) {
      case Direction.Down:
        if (openNum === 0 && workNum > 0) {
          this.fuzzySelectionIndex = [sel[0] + 1, 1];
        } else {
          this.fuzzySelectionIndex = [sel[0] + 1, sel[1]];
        }
        break;
      case Direction.Up:
        this.fuzzySelectionIndex = [sel[0] - 1, sel[1]];
        break;
      case Direction.Left:
        if (sel[1] === 1 && openNum === 0) {
          this.fuzzySelectionIndex = [sel[0], sel[1]];
        } else {
          this.fuzzySelectionIndex = [sel[0], sel[1] - 1];
        }
        break;
      case Direction.Right:
        if (sel[1] === 0 && workNum === 0) {
          this.fuzzySelectionIndex = [sel[0], sel[1]];
        } else {
          this.fuzzySelectionIndex = [sel[0], sel[1] + 1];
        }
        break;
      default:
        break;
    }
    if (this.fuzzySelectionIndex[1] === 0) {
      if (this.fuzzySelectionIndex[0] > openNum - 1) {
        this.fuzzySelectionIndex[0] = openNum - 1;
      }
    } else if (this.fuzzySelectionIndex[1] === 1) {
      if (this.fuzzySelectionIndex[0] > workNum - 1) {
        this.fuzzySelectionIndex[0] = workNum - 1;
      }
    }
    this.fuzzySelectionIndex = [
      Math.max(-1, this.fuzzySelectionIndex[0]),
      clamp(this.fuzzySelectionIndex[1], 0, 1),
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
    if (this.activeWorkspaceNameRef !== null) {
      this.activeWorkspaceNameRef.current?.focus();
      return;
    }
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
    this.filteredOpenTabs = openTabFuse.search(pattern, { limit: 10 });

    const workspaceItems: Instance<typeof Item>[] = [];
    this.workspaceStore.workspaces.forEach((workspace) => {
      workspace.items.forEach((item) => {
        workspaceItems.push(item);
      });
    });
    const workspaceTabFuse = new Fuse<Instance<typeof Item>>(workspaceItems, {
      keys: ['title'],
    });
    this.filteredWorkspaceTabs = workspaceTabFuse.search(pattern, {
      limit: 10,
    });
  }

  setUrlText(newValue: string) {
    this.urlText = newValue;
    if (newValue.length > 0) {
      this.View = View.FuzzySearch;
      this.searchTab(newValue);
      ipcRenderer.send('unset-tab');
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

  setNavigatorTabModal(loc: [number, number]) {
    this.navigatorTabModal = loc;
  }

  constructor(workspaceStore: Instance<typeof WorkspaceStore>) {
    makeAutoObservable(this);

    this.versionString = packageInfo.version;
    this.workAreaRect = { x: 0, y: 0, width: 1, height: 1 };
    this.screen = { width: 200, height: 200 };
    this.innerBounds = { x: 0, y: 0, width: 100, height: 100 };
    this.workspaceStore = workspaceStore;

    this.filteredOpenTabs = [];
    this.filteredWorkspaceTabs = [];

    ipcRenderer.on('inner-bounds', (_, { screen, bounds }) => {
      console.log('inner bounds set');
      runInAction(() => {
        this.screen = screen;
        this.innerBounds = bounds;
      });
    });
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
    ipcRenderer.on('toggle-debug-modal', () => {
      runInAction(() => {
        if (this.View !== View.NavigatorDebug) {
          this.View = View.NavigatorDebug;
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
        if (newIsActive && this.View !== View.Navigator) {
          return;
        }
        if (newIsActive) {
          this.View = View.Tabs;
        } else {
          this.View = View.Navigator;
        }
      });
    });
    ipcRenderer.on('focus-search', () => {
      this.setFocus();
      this.selectText();
    });
    ipcRenderer.on('focus-main', () => {
      this.urlBoxRef?.current?.focus();
      this.urlBoxRef?.current?.select();
    });
    ipcRenderer.on('set-pinned', (_, newIsPinned) => {
      runInAction(() => {
        this.isPinned = newIsPinned;
      });
    });
    ipcRenderer.on('set-window-floating', (_, windowFloating) => {
      runInAction(() => {
        this.windowFloating = windowFloating;
      });
    });
    ipcRenderer.on('will-navigate', () => {
      runInAction(() => {
        this.navigatorTabModalSelectedNodeId = '';
        this.navigatorTabModal = [0, 0];
      });
    });
    ipcRenderer.on('resize-work-area', (_, workSpaceRect) => {
      runInAction(() => {
        this.workAreaRect = workSpaceRect;
      });
    });
  }
}

interface IContext {
  tabPageStore: TabPageStore;
  historyStore: Instance<typeof HistoryStore>;
  workspaceStore: Instance<typeof WorkspaceStore>;
  keybindStore: Instance<typeof KeybindStore>;
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
