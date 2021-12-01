/* eslint-disable no-console */
import { makeAutoObservable, runInAction } from 'mobx';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Session } from '@supabase/gotrue-js';
import { ipcRenderer } from 'electron';
import { RefObject, createContext, useContext } from 'react';
import Fuse from 'fuse.js';
import { Instance } from 'mobx-state-tree';
import { DropResult } from 'react-beautiful-dnd';
import { TabPageColumn, TabPageTab } from '../interfaces/tab';
import { getRootDomain } from '../utils/data';
import { Item } from './workspace/item';
import { Direction } from '../render-constants';
import { chord, clamp } from '../utils/utils';
import { HistoryEntry } from '../utils/interfaces';
import { HistoryStore } from './history-store';
import WorkspaceStore from './workspace/workspace-store';
import packageInfo from '../package.json';
import { Bind, KeybindStore } from './keybinds';
import TabStore from './tabs';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../constants';

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
    if (this.view === view) {
      return;
    }
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

  isPinned = false;

  urlBoxRef: RefObject<HTMLInputElement> | null = null;

  historyBoxRef: RefObject<HTMLInputElement> | null = null;

  activeGroupBoxRef: RefObject<HTMLInputElement> | null = null;

  editingGroupId = '';

  activeWorkspaceNameRef: RefObject<HTMLInputElement> | null = null;

  fuzzySelectionIndex: [number, number] = [0, 0];

  windowSize: { width: number; height: number };

  innerBounds: { x: number; y: number; width: number; height: number };

  private workspaceStore: Instance<typeof WorkspaceStore>;

  private keybindStore: Instance<typeof KeybindStore>;

  windowFloating = false;

  versionString = 'None';

  keys = '';

  bindKeys: string[] = [];

  rebindModalId = '';

  seenEmailForm: boolean | undefined = false;

  urlBoxFocus = false;

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

  fuzzyDown(e: KeyboardEvent) {
    e.preventDefault();
    this.moveFuzzySelection(Direction.Down);
  }

  fuzzyUp(e: KeyboardEvent) {
    e.preventDefault();
    this.moveFuzzySelection(Direction.Up);
  }

  fuzzyLeft(e: KeyboardEvent) {
    if (this.fuzzySelectionIndex[0] > -1) {
      e.preventDefault();
      this.moveFuzzySelection(Direction.Left);
    }
  }

  fuzzyRight(e: KeyboardEvent) {
    if (this.fuzzySelectionIndex[0] > -1) {
      e.preventDefault();
      this.moveFuzzySelection(Direction.Right);
    }
  }

  handleKeyBind(e: KeyboardEvent) {
    if (this.view === View.FuzzySearch) {
      if (this.keybindStore.isBind(e, Bind.FuzzyUp)) {
        this.fuzzyUp(e);
      }
      if (this.keybindStore.isBind(e, Bind.FuzzyDown)) {
        this.fuzzyDown(e);
      }
      if (this.keybindStore.isBind(e, Bind.FuzzyLeft)) {
        this.fuzzyLeft(e);
      }
      if (this.keybindStore.isBind(e, Bind.FuzzyRight)) {
        this.fuzzyRight(e);
      }
    } else if (this.view !== View.Settings) {
      this.setFocus();
      this.fuzzySelectionIndex = [-1, -1];
    }
  }

  closeTab(id: number, currentlyActive = false) {
    const neighborId = this.leftOrRightOfTab(id);
    if (currentlyActive && neighborId) {
      ipcRenderer.send('set-tab', neighborId);
    }
    ipcRenderer.send('remove-tab', id);
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

    if (this.view === View.Navigator) {
      if (this.urlBoxFocus) {
        return;
      }
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
        this.fuzzyUp(e);
        break;
      case 'ArrowDown':
        this.fuzzyDown(e);
        break;
      case 'ArrowLeft':
        this.fuzzyLeft(e);
        break;
      case 'ArrowRight':
        this.fuzzyRight(e);
        break;
      default:
        this.handleKeyBind(e);
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

  sorting: number[] = [];

  lastRHSDescendentIndex(rootIndex: number, ancestorIndex: number): number {
    const rootId = this.sorting[rootIndex];
    const tabRHSId = this.sorting[rootIndex + 1];
    const ancestorId = this.sorting[ancestorIndex];

    if (
      typeof rootId !== 'undefined' &&
      typeof tabRHSId !== 'undefined' &&
      typeof ancestorId !== 'undefined'
    ) {
      const tabRHS = this.openTabs[tabRHSId];
      if (tabRHS && tabRHS.ancestor === ancestorId) {
        return this.lastRHSDescendentIndex(rootIndex + 1, ancestorIndex);
      }
    }

    return rootIndex + 1;
  }

  newWindowIndex(tab: TabPageTab): number | undefined {
    const tabSortIndex = this.sorting.findIndex(
      (webViewId) => webViewId === tab.id
    );

    if (tabSortIndex !== -1 && !(tabSortIndex + 1 >= this.sorting.length)) {
      if (!tab.unRooted) {
        return this.lastRHSDescendentIndex(tabSortIndex, tabSortIndex);
      }
      tab.unRooted = false;
      Object.values(this.openTabs).forEach((openTab) => {
        if (openTab.ancestor === tab.id) {
          openTab.ancestor = undefined;
        }
      });
      return tabSortIndex + 1;
      // prune the parents
      // root the tab
      // return loc + 1
    }

    return undefined;

    // if (!tab.unRooted) {
    //   const tabSortIndex = this.sorting.findIndex(
    //     (webViewId) => webViewId === tab.id
    //   );
    //   if (tabSortIndex !== -1) {
    //     if (tabSortIndex + 1 >= this.sorting.length) {
    //       return undefined;
    //     }
    //     return this.lastRHSDescendentIndex(tabSortIndex, tabSortIndex);
    //     // return tabSortIndex + 1;
    //   }
    //   return undefined;
    // }
    // return undefined;
  }

  createTab(id: number, parentId?: number) {
    this.sorting.push(id);
    this.newTabBumpOrder.push(id);
    if (typeof parentId !== 'undefined') {
      const parentTab = this.openTabs[parentId];
      if (parentTab) {
        const newIndex = this.newWindowIndex(parentTab);
        if (typeof newIndex !== 'undefined') {
          this.reorderFromIndex(this.sorting.length - 1, newIndex);
        }
      }
    }
    this.openTabs[id] = {
      id,
      lastAccessTime: new Date().getTime(),
      url: '',
      title: '',
      image: '',
      favicon: '',
      openGraphInfo: null,
      canGoForward: false,
      canGoBack: false,
      ancestor: undefined,
      unRooted: false,
    };
    this.bumpTab(id);
  }

  deleteTab(idToRemove: number) {
    this.sorting = this.sorting.filter((id) => id !== idToRemove);
    this.newTabBumpOrder = this.newTabBumpOrder.filter(
      (id) => id !== idToRemove
    );
    // this.sorting.
    delete this.openTabs[idToRemove];
    // todo: could filter the fuse instead if it was a property
    this.refreshFuse();
  }

  reorderFromIndex(startIndex: number, endIndex: number) {
    if (startIndex !== endIndex) {
      const tabId = this.sorting[startIndex];
      if (typeof tabId !== 'undefined') {
        const tab = this.openTabs[tabId];
        if (tab) {
          tab.unRooted = true;
        }
      }
    }

    const [removed] = this.sorting.splice(startIndex, 1);

    this.sorting.splice(endIndex, 0, removed);
  }

  reorderTabs(result: DropResult) {
    // result.source.index,
    // result.destination.index
    // const result = Array.from(list);

    if (result.destination) {
      const startIndex = result.source.index;
      const endIndex = result.destination?.index;

      this.reorderFromIndex(startIndex, endIndex);
    }

    // const [removed] = result.splice(startIndex, 1);
    // result.splice(endIndex, 0, removed);
    // const tabList = this.sorting.map((id) => this.openTabs[id]);

    // return tabList;
    // const sourceWebViewId = parseInt(result.source.droppableId, 10);
    // const sourceIndex = result.source.index;
    //
    // if (result.destination) {
    //   const destWebViewId = parseInt(result.destination.droppableId, 10);
    //   const destIndex = result.source.index;
    //
    //   ipcRenderer.send('log-data', [id, result]);
    // }
  }

  tabPageOrdered(sorting: number[]): TabPageTab[] {
    const row = sorting.map((id) => this.openTabs[id]);
    row.filter((tab) => {
      return !!tab && typeof tab !== 'undefined';
    });
    return row;
  }

  tabPageRow(): TabPageTab[] {
    return this.tabPageOrdered(this.sorting);
  }

  syncBumpOrder() {
    let synced = true;
    if (
      this.newTabBumpOrder &&
      this.newTabBumpOrder.length === this.tabBumpOrder.length
    ) {
      this.newTabBumpOrder.forEach((newId, index) => {
        if (synced) {
          synced = newId === this.tabBumpOrder[index];
        }
      });
    } else {
      synced = false;
    }
    if (!synced) {
      if (typeof this.newTabBumpOrder !== 'undefined') {
        this.tabBumpOrder = [...this.newTabBumpOrder];
      }
    }
  }

  tabBumpOrder: number[] = [];

  newTabBumpOrder: number[] = [];

  bumpTab(id: number) {
    if (this.newTabBumpOrder[0] === id) {
      return;
    }
    const idx = this.newTabBumpOrder.findIndex((openTabId) => openTabId === id);
    if (typeof idx !== 'undefined') {
      const [removed] = this.newTabBumpOrder.splice(idx, 1);
      // ipcRenderer.send('log-data', ['bump', removed]);
      this.newTabBumpOrder.unshift(removed);
    }
  }

  imageBoardTabs(): TabPageTab[] {
    return this.tabPageOrdered(this.tabBumpOrder);
  }

  isFirstTab(id: number) {
    const tabs = Object.values(this.openTabs);
    const match = tabs.findIndex((element) => {
      return element.id === id;
    });
    return match === 0;
  }

  tabCanGoForward(id: string) {
    const tab = this.openTabs[id];
    if (tab) {
      return tab.canGoForward;
    }
    return false;
  }

  tabCanGoBack(id: string) {
    const tab = this.openTabs[id];
    if (tab) {
      return tab.canGoBack;
    }
    return false;
  }

  leftOfTab(id: number): number | null {
    const tabs = Object.values(this.openTabs);
    const match = tabs.findIndex((element) => {
      return element.id === id;
    });
    if (match) {
      return tabs[match - 1].id;
    }
    return null;
  }

  leftOrRightOfTab(id: number) {
    const tabs = Object.values(this.openTabs);
    if (tabs.length <= 1) {
      return null;
    }
    const match = tabs.findIndex((element) => {
      return element.id === id;
    });
    if (match !== null) {
      if (match === 0) {
        return tabs[1].id;
      }
      if (tabs.length > match + 1) {
        return tabs[match + 1].id;
      }
      return tabs[match - 1].id;
    }
    return null;
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

  findAncestorId(rootId: number): number {
    // tabs are their own ancestors until a parent id is added
    const tab = this.openTabs[rootId];
    if (tab && typeof tab.ancestor !== 'undefined') {
      return this.findAncestorId(tab.ancestor);
    }
    if (tab) {
      if (typeof tab.ancestor !== 'undefined') {
        return tab.ancestor;
      }
      return tab.id;
    }
    return rootId;
  }

  session: Session | null = null;

  supaClient: SupabaseClient;

  refreshSession(session: Session | null) {
    // console.log('refreshSession', session);
    if (!session || !session.refresh_token) {
      this.clearSession();
      return;
    }
    this.supaClient.auth
      .setSession(session.refresh_token)
      .then((data) => {
        const { session: liveSession } = data;
        this.session = liveSession;
        // console.log('refreshed', liveSession);
        ipcRenderer.send('refresh-session', liveSession);
        return 0;
      })
      .catch((error) => {
        // console.log('refresh error', error);
        ipcRenderer.send('log-data', error);
        this.clearSession();
      });
  }

  clearSession() {
    console.log('sign out');
    this.session = null;
    this.supaClient.auth.signOut();
    ipcRenderer.send('clear-session');
  }

  timeoutHandle = -1;

  constructor(
    workspaceStore: Instance<typeof WorkspaceStore>,
    keybindStore: Instance<typeof KeybindStore>
  ) {
    makeAutoObservable(this);

    this.supaClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    ipcRenderer.send('request-session');

    ipcRenderer.on('session', (_, session) => {
      // console.log('got session');
      this.refreshSession(session);
    });

    setInterval(() => {
      console.log('refresh');
      this.refreshSession(this.session);
    }, 1000 * 60 * 60);

    this.versionString = packageInfo.version;
    this.windowSize = { width: 200, height: 200 };
    this.innerBounds = { x: 0, y: 0, width: 100, height: 100 };
    this.workspaceStore = workspaceStore;

    this.keybindStore = keybindStore;

    this.filteredOpenTabs = [];
    this.filteredWorkspaceTabs = [];

    ipcRenderer.on('inner-bounds', (_, { windowSize, bounds }) => {
      runInAction(() => {
        this.windowSize = windowSize;
        this.innerBounds = bounds;
      });
    });
    ipcRenderer.on('set-tab-parent', (_, [rootId, parentId]) => {
      runInAction(() => {
        const tab = this.openTabs[rootId];
        if (tab) {
          const ancestorId = this.findAncestorId(parentId);
          // if a tab thinks it is its own ancestor, swap use the parent id
          if (typeof ancestorId === 'undefined' || ancestorId === tab.id) {
            tab.ancestor = parentId;
          } else {
            tab.ancestor = ancestorId;
          }
        }
      });
    });
    ipcRenderer.on('tabView-created-with-id', (_, [id, parentId]) => {
      runInAction(() => {
        this.createTab(id, parentId);
      });
    });
    ipcRenderer.on('tab-removed', (_, id) => {
      runInAction(() => {
        this.deleteTab(id);
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
    ipcRenderer.on(
      'web-contents-update',
      (_, [id, canGoBack, canGoForward]) => {
        runInAction(() => {
          this.openTabs[id].canGoBack = canGoBack;
          this.openTabs[id].canGoForward = canGoForward;
        });
      }
    );
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
    ipcRenderer.on('gesture', (_, { id }) => {
      // ipcRenderer.send('log-data', 'render-gesture');
      this.bumpTab(id);
    });
    ipcRenderer.on('will-navigate', (_, { id }) => {
      runInAction(() => {
        this.navigatorTabModalSelectedNodeId = '';
        this.navigatorTabModal = [0, 0];
        this.bumpTab(id);
      });
    });
    ipcRenderer.on('set-seenEmailForm', (_, seenEmailForm) => {
      runInAction(() => {
        this.seenEmailForm = seenEmailForm;
      });
    });
    ipcRenderer.on('close-tab', (_, tabId) => {
      const neighborId = this.leftOrRightOfTab(tabId);
      if (neighborId) {
        ipcRenderer.send('set-tab', neighborId);
      }
      ipcRenderer.send('remove-tab', tabId);
      ipcRenderer.send('mixpanel-track', 'close tab with hotkey in webview');
    });
    ipcRenderer.on('tab-was-set', (_, id) => {
      runInAction(() => {
        if (this.timeoutHandle !== -1) {
          clearTimeout(this.timeoutHandle);
        }
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.timeoutHandle = setTimeout(() => {
          this.bumpTab(id);
          this.timeoutHandle = -1;
        }, 5000);
      });
    });
    ipcRenderer.on('unset-tab', (_, id) => {
      if (typeof id !== 'undefined') {
        this.bumpTab(id);
      }
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = -1;
    });
  }
}

interface IContext {
  tabPageStore: TabPageStore;
  historyStore: Instance<typeof HistoryStore>;
  workspaceStore: Instance<typeof WorkspaceStore>;
  keybindStore: Instance<typeof KeybindStore>;
  tabStore: TabStore;
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
