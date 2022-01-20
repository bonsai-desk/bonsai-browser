/* eslint-disable no-console */
import { makeAutoObservable, runInAction, toJS } from 'mobx';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { Session } from '@supabase/gotrue-js';
import { ipcRenderer, IpcRendererEvent } from 'electron';
import { createContext, RefObject, useContext } from 'react';
import Fuse from 'fuse.js';
import { Instance } from 'mobx-state-tree';
import { DropResult } from 'react-beautiful-dnd';
import { Database } from '@nozbe/watermelondb';
import { bind, unbind } from 'mousetrap';
import { TabPageTab, TabPageTabInfo } from '../interfaces/tab';
import { Direction } from '../render-constants';
import { baseUrl, chord, clamp, unixNow } from '../utils/utils';
import { HistoryEntry } from '../utils/interfaces';
import { HistoryStore } from './history-store';
import WorkspaceStore from './workspace/workspace-store';
import packageInfo from '../package.json';
import { KeybindStore } from './keybinds';
import TabStore from './tabs';
import { SUPABASE_ANON_KEY, SUPABASE_URL, View } from '../constants';
import TagModel from '../watermelon/TagModel';
import { TagModalData } from '../pages/TagModal';
import {
  addTagStrings,
  getTag,
  removeTagStrings,
} from '../watermelon/databaseUtils';

const NOT_TEXT = [
  'Escape',
  'Backspace',
  'ShiftLeft',
  'ControlLeft',
  'MetaLeft',
  'AltLeft',
  'ShiftRight',
  'ControlRight',
  'MetaRight',
  'AltRight',
  'Insert',
  'Home',
  'PageUp',
  'Delete',
  'End',
  'PageDown',
  'F1',
  'F2',
  'F3',
  'F4',
  'F5',
  'F6',
  'F7',
  'F8',
  'F9',
  'F10',
  'F11',
  'F12',
  'F13',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
];

require('dotenv').config();

function renderOn(
  channel: string,
  listener: (event: IpcRendererEvent, ...args: any[]) => void
) {
  if (process.env.NODE_ENV === 'development' && process.env.DEBUG === 'true') {
    ipcRenderer.on(channel, (...args) => {
      ipcRenderer.send('log-data', channel);
      listener(...args);
    });
  } else {
    ipcRenderer.on(channel, listener);
  }
}

export enum HomeView {
  List,
  Domain,
}

export default class TabPageStore {
  // region properties

  // region home

  homeView: HomeView = HomeView.List;

  // endregion

  // region unsorted

  private keybindStore: Instance<typeof KeybindStore>;

  private historyStore: Instance<typeof HistoryStore>;

  private view: View = View.Tabs;

  viewNavStack: [View, number, string, string][] = [];

  public get View() {
    return this.view;
  }

  public set View(view: View) {
    this.setView(view);
  }

  setView(view: View, addToNavStack = true) {
    // return if view is the same as before
    if (this.view === view) {
      return;
    }

    if (addToNavStack) {
      this.pushNavEntry([
        this.View,
        this.activeTabId,
        this.viewingTag ? this.viewingTag.title : '',
        this.urlText,
      ]);
    }

    this.view = view;

    if (view === View.Tabs) {
      this.hoveringUrlInput = true;
    }
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

  highlightedTabId: number | string = 0;

  sorting: number[] = [];

  tabBumpOrder: number[] = [];

  session: Session | null = null;

  supaClient: SupabaseClient;

  sessionChangeCallback: ((userId: string) => void) | null = null;

  // timeoutHandle = -1;

  refreshHandle: NodeJS.Timeout | null;

  activeHomeTabId: string | number = -1;

  navigatorTabModal = [0, 0];

  navigatorTabModalSelectedNodeId = '';

  hoveringUrlInput = false;

  openTabs: Record<string, TabPageTab> = {};

  filteredOpenTabs: Fuse.FuseResult<TabPageTab>[];

  historyMap = new Map<string, HistoryEntry>();

  searchResult: HistoryEntry[] | null = null;

  urlText = '';

  historyText = '';

  isPinned = false;

  preventBonsaiBoxEnter = false;

  bonsaiBoxRef: RefObject<HTMLInputElement> | null = null;

  historyBoxRef: RefObject<HTMLInputElement> | null = null;

  activeGroupBoxRef: RefObject<HTMLInputElement> | null = null;

  editingGroupId = '';

  activeWorkspaceNameRef: RefObject<HTMLInputElement> | null = null;

  fuzzySelectionIndex: [number, number] = [0, 0];

  windowSize: { width: number; height: number };

  innerBounds: { x: number; y: number; width: number; height: number };

  topPadding = 0;

  database: Database | null = null;

  windowFloating = false;

  versionString = 'None';

  keys = '';

  bindKeys: string[] = [];

  rebindModalId = '';

  seenEmailForm: boolean | undefined = false;

  urlBoxFocus = false;

  bonsaiBoxFocus = false;

  tagBoxFocus = false;

  viewingTag: TagModel | null = null;

  activeTabId = -1;

  selectedForTagTab: TabPageTabInfo | null = null;

  // lastActiveTabId = -1;

  // endregion

  // endregion

  // region methods

  // region home

  setUrlText(newValue: string) {
    this.urlText = newValue;

    if (!this.bonsaiBoxFocus && this.urlText) {
      // tabPageStore.setFocus()
      this.bonsaiBoxRef?.current?.focus();
    }
    if (this.bonsaiBoxFocus && !this.urlText) {
      // tabPageStore.setFocus()
      // this.bonsaiBoxRef?.current?.blur();
    }

    if (newValue.length > 0) {
      this.View = View.FuzzySearch;
      this.searchTab(newValue);
      ipcRenderer.send('unset-tab');
    } else if (this.View !== View.Navigator) {
      this.View = View.Tabs;
    }
  }

  blurBonsaiBox() {
    if (this.bonsaiBoxFocus) {
      this.bonsaiBoxRef?.current?.blur();
    }
  }

  handleEscape() {
    if (this.View === View.Navigator && this.bonsaiBoxFocus) {
      this.bonsaiBoxRef?.current?.blur();
      this.setUrlText('');
      ipcRenderer.send('toggle');
      return;
    }

    if (
      this.View === View.History ||
      this.View === View.Settings ||
      this.View === View.TagView ||
      this.View === View.AllTagsView ||
      this.View === View.NavigatorDebug
    ) {
      this.View = View.Tabs;
    } else if (this.urlText.length > 0 || this.bonsaiBoxFocus) {
      this.bonsaiBoxRef?.current?.blur();
      this.setUrlText('');
    } else {
      ipcRenderer.send('toggle');
    }
  }

  handleTab() {
    if (this.View === View.Tabs) {
      this.cycleHomeView('right');
    }
  }

  teleportHomeCursor(position: 'top' | 'bottom') {
    const openTabs = this.openTabsBySorting(this.tabBumpOrder);
    let idx = -1;
    if (position === 'top') {
      idx = 0;
    }
    if (position === 'bottom') {
      idx = openTabs.length - 1;
    }
    const tab = openTabs[idx];
    if (typeof tab !== 'undefined') {
      this.activeHomeTabId = tab.id;
      this.setHighlightedTabId(this.activeHomeTabId);
    }
  }

  // moveHomeCursor(direction: 'down' | 'up') {
  //   const tabs = this.openTabsBySorting(this.tabBumpOrder);
  //   const root = tabs.find((tab) => {
  //     return tab.id === this.highlightedTabId;
  //   });
  //   if (typeof root !== 'undefined') {
  //     const id = relativeItem(root, tabs, direction);
  //     if (typeof id !== 'undefined') {
  //       this.activeHomeTabId = id;
  //       this.setHighlightedTabId(this.activeHomeTabId);
  //     }
  //   }
  // }

  handleEnter() {
    if (this.View === View.FuzzySearch && !this.preventBonsaiBoxEnter) {
      // ipcRenderer.send('open-workspace-url', tab.url);
      ipcRenderer.send('search-url', [
        this.urlText,
        this.keybindStore.searchString(),
      ]);
      this.setUrlText('');
      this.bonsaiBoxRef?.current?.blur();
    }
  }

  highlightedTab(): TabPageTab | undefined {
    return this.openTabs[this.highlightedTabId];
  }

  setHighlightedTabId(id: number | string) {
    this.highlightedTabId = id;
  }

  // closeHighlightedTab() {
  //   const openTabs = this.openTabsBySorting(this.tabBumpOrder);
  //   const idToRemove = this.highlightedTabId;
  //   const idx = openTabs.findIndex((tab) => {
  //     return tab.id === this.highlightedTabId;
  //   });
  //   if (idx !== -1) {
  //     if (idx === this.tabBumpOrder.length - 1) {
  //       this.moveHomeCursor('up');
  //     } else {
  //       this.moveHomeCursor('down');
  //     }
  //   }
  //   ipcRenderer.send('remove-tab', idToRemove);
  // }

  // keys -> (handle -> fn)
  mouseBinds: Record<string, Record<string, () => void>> = {};

  registerKeybind(keys: string | string[], callback: () => void): string {
    const insertBind = (key: string, handle: string, fn: () => void) => {
      this.mouseBinds[key] = this.mouseBinds[key] || {};
      this.mouseBinds[key][handle] = fn;
    };
    const uuid = uuidv4();
    if (Array.isArray(keys)) {
      keys.forEach((key) => {
        insertBind(key, uuid, callback);
      });
    } else {
      insertBind(keys, uuid, callback);
    }
    return uuid;
  }

  unregisterKeybind(handle: string) {
    Object.values(this.mouseBinds).forEach((v) => {
      delete v[handle];
    });
  }

  invokeKeybind(keys: string | string[]) {
    if (Array.isArray(keys)) {
      keys.forEach((key) => {
        Object.values(this.mouseBinds[key]).forEach((fn) => {
          fn();
        });
      });
    } else {
      Object.values(this.mouseBinds[keys]).forEach((fn) => {
        fn();
      });
    }
  }

  bindMouseTrap() {
    bind(['alt+h', 'alt+left'], (e) => {
      e.preventDefault();
      ipcRenderer.send('float-left');
    });
    bind(['alt+l', 'alt+right'], (e) => {
      e.preventDefault();
      ipcRenderer.send('float-right');
    });
    bind('enter', (e) => {
      e.preventDefault();
      this.invokeKeybind('enter');
    });
    bind('ctrl+k', (e) => {
      if (this.view === View.FuzzySearch) {
        this.fuzzyUp(e);
      }
    });
    bind('ctrl+j', (e) => {
      if (this.view === View.FuzzySearch) {
        this.fuzzyDown(e);
      }
    });
    bind('ctrl+h', (e) => {
      if (this.view === View.FuzzySearch) {
        this.fuzzyLeft(e);
      }
    });
    bind('ctrl+l', (e) => {
      if (this.view === View.FuzzySearch) {
        this.fuzzyRight(e);
      }
    });
    bind(['g g'], (e) => {
      if (!this.bonsaiBoxFocus) {
        e.preventDefault();
        this.teleportHomeCursor('top');
      }
    });
    bind(['G'], (e) => {
      if (!this.bonsaiBoxFocus) {
        e.preventDefault();
        this.teleportHomeCursor('bottom');
      }
    });
    bind('tab', (e) => {
      e.preventDefault();
      this.handleTab();
    });
    bind('shift+tab', (e) => {
      e.preventDefault();
      if (this.View === View.Tabs) {
        this.cycleHomeView('left');
      }
    });
    bind('esc', () => {
      this.handleEscape();
    });
    bind('/', (e) => {
      if (!this.bonsaiBoxFocus) {
        e.preventDefault();
        this.setFocus();
      }
    });
  }

  static unbindMouseTrap() {
    unbind('j');
    unbind('tab');
    unbind('esc');
    unbind('enter');
  }

  cycleHomeView(direction: 'left' | 'right') {
    const views: HomeView[] = [HomeView.List, HomeView.Domain];
    const idx = views.findIndex((view) => this.homeView === view);
    const shift = direction === 'left' ? -1 : 1;
    if (idx !== -1) {
      const newView = (idx + shift) % views.length;
      if (newView < 0) {
        this.homeView = views[views.length - 1];
      } else {
        this.homeView = views[newView];
      }
    }
  }

  setHomeView(view: HomeView) {
    this.homeView = view;
  }

  handleKeyBind(e: KeyboardEvent) {
    if (e.altKey) {
      return;
    }

    // if (
    //   !e.altKey &&
    //   (e.key === 'ArrowUp' ||
    //     e.key === 'ArrowDown' ||
    //     e.key === 'ArrowLeft' ||
    //     e.key === 'ArrowRight')
    // ) {
    //   e.preventDefault();
    // }

    if (this.view === View.FuzzySearch) {
      const fu = this.keybindStore.isBind(e, 'fuzzy-up');
      const fd = this.keybindStore.isBind(e, 'fuzzy-down');
      const fl = this.keybindStore.isBind(e, 'fuzzy-left');
      const fr = this.keybindStore.isBind(e, 'fuzzy-right');
      if (fu || e.key === 'ArrowUp') {
        return;
      }
      if (fd || e.key === 'ArrowDown') {
        return;
      }
      if (fl || e.key === 'ArrowLeft') {
        return;
      }
      if (fr || e.key === 'ArrowRight') {
        return;
      }

      this.fuzzySelectionIndex = [-1, -1];

      if (!NOT_TEXT.includes(e.code)) {
        this.setFocus();
      }
    }
  }

  handleKeyDown(e: KeyboardEvent) {
    if (this.View === View.Settings && this.rebindModalId) {
      e.preventDefault();
      this.bindKeys = chord(e);
      return;
    }

    if (
      this.view === View.Navigator &&
      (this.urlBoxFocus || this.tagBoxFocus)
    ) {
      return;
    }

    this.handleKeyBind(e);
  }

  // endregion

  // region tags

  setViewingTag(tag: TagModel, addToNavStack = true) {
    if (this.View === View.Navigator) {
      ipcRenderer.send('click-main');
    }
    if (this.View !== View.TagView) {
      this.setView(View.TagView, addToNavStack);
    } else if (addToNavStack) {
      this.pushNavEntry([
        this.View,
        this.activeTabId,
        this.viewingTag ? this.viewingTag.title : '',
        this.urlText,
      ]);
    }

    this.viewingTag = tag;
  }

  pushNavEntry(entry: [View, number, string, string]) {
    this.viewNavStack.push(entry);
    while (this.viewNavStack.length > 256) {
      this.viewNavStack.shift();
    }
  }

  printNavHistory() {
    ipcRenderer.send(
      'log-data',
      JSON.stringify(
        this.viewNavStack.map((printEntry) => [
          View[printEntry[0]],
          printEntry[1],
          printEntry[2],
        ])
      )
    );
  }

  // endregion

  // region unsorted

  fuzzyDown(e: KeyboardEvent) {
    e.preventDefault();
    this.moveFuzzySelection(Direction.Down);
  }

  fuzzyUp(e: KeyboardEvent) {
    e.preventDefault();
    this.moveFuzzySelection(Direction.Up);
  }

  fuzzyLeft(e: KeyboardEvent) {
    e.preventDefault();
    if (this.fuzzySelectionIndex[0] > -1) {
      this.moveFuzzySelection(Direction.Left);
    }
  }

  fuzzyRight(e: KeyboardEvent) {
    e.preventDefault();
    if (this.fuzzySelectionIndex[0] > -1) {
      this.moveFuzzySelection(Direction.Right);
    }
  }

  closeTab(id: number, currentlyActive = false) {
    const neighborId = this.leftOrRightOfTab(id);
    if (currentlyActive && neighborId) {
      ipcRenderer.send('set-tab', neighborId);
    }
    ipcRenderer.send('remove-tab', id);
  }

  moveFuzzySelection(direction: Direction) {
    const sel = this.fuzzySelectionIndex;

    const openNum = this.filteredOpenTabs.length;
    const workNum = 0;

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
    this.tabBumpOrder.push(id);
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
      openGraphInfo: undefined,
      canGoForward: false,
      canGoBack: false,
      ancestor: undefined,
      unRooted: false,
    };
    this.bumpTab(id);
  }

  deleteTab(idToRemove: number) {
    this.sorting = this.sorting.filter((id) => id !== idToRemove);
    this.tabBumpOrder = this.tabBumpOrder.filter((id) => id !== idToRemove);
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
    if (result.destination) {
      const startIndex = result.source.index;
      const endIndex = result.destination?.index;

      this.reorderFromIndex(startIndex, endIndex);
    }
  }

  openTabsBySorting(sorting: number[]): TabPageTab[] {
    const row = sorting.map((id) => this.openTabs[id]);
    return row.filter((tab) => {
      return !!tab && typeof tab !== 'undefined';
    });
  }

  tabPageRow(): TabPageTab[] {
    return this.openTabsBySorting(this.sorting);
  }

  bumpTab(id: number) {
    if (this.tabBumpOrder[0] === id) {
      return;
    }
    const idx = this.tabBumpOrder.findIndex((openTabId) => openTabId === id);
    if (typeof idx !== 'undefined') {
      const [removed] = this.tabBumpOrder.splice(idx, 1);
      // ipcRenderer.send('log-data', ['bump', removed]);
      this.tabBumpOrder.unshift(removed);
    }
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

  ringTabNeighbor(
    targetId: number,
    side: 'left' | 'right'
  ): number | undefined {
    const matchIdx = this.sorting.findIndex((id) => {
      return targetId === id;
    });
    if (matchIdx !== -1) {
      if (side === 'left') {
        const leftIdx = matchIdx - 1;
        if (leftIdx < 0) {
          return this.sorting[this.sorting.length - 1];
        }
        return this.sorting[leftIdx];
      }
      const rightIdx = matchIdx + 1;
      if (rightIdx > this.sorting.length - 1) {
        return this.sorting[0];
      }
      return this.sorting[rightIdx];
    }
    return undefined;
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
        this.bonsaiBoxRef?.current?.focus();
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
        this.bonsaiBoxRef?.current?.select();
    }
  }

  searchTab(pattern: string) {
    // open tab search
    const openTabFuse = new Fuse<TabPageTab>(Object.values(this.openTabs), {
      keys: ['title', 'openGraphData.title'],
    });
    this.filteredOpenTabs = openTabFuse.search(pattern, { limit: 10 });

    // tags search
    // (async () => {
    //   if (!this.database) {
    //     return;
    //   }
    //   const tags = await this.database
    //     .get<TagModel>(TableName.TAGS)
    //     .query()
    //     .fetch();
    //
    //   console.log(tags.length);
    // })();
  }

  refreshFuse() {
    this.searchTab(this.urlText);
  }

  setHistoryText(newValue: string) {
    this.historyText = newValue;
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

  handleRefreshError(error: any) {
    const expiresAt = this.supaClient.auth.session()?.expires_at;

    console.log(expiresAt);
    if (typeof expiresAt === 'undefined' || error.status === 400) {
      this.clearSession();
      return;
    }

    const delta = expiresAt - unixNow();
    if (delta <= 0) {
      this.clearSession();
    }
  }

  refreshSession(session: Session | null) {
    // console.log('refreshSession', session, this.session);
    if (!session || !session.refresh_token) {
      ipcRenderer.send('log-data', ['clear session', session]);
      ipcRenderer.send('mixpanel-track-prop', {
        eventName: 'no session when refreshing',
      });
      this.clearSession();
      return;
    }

    this.supaClient.auth
      .setSession(session.refresh_token)
      .then((data) => {
        const { session: liveSession, error } = data;
        if (error) {
          this.handleRefreshError(error);
        } else {
          // console.log('refresh then ', error, liveSession);
          runInAction(() => {
            this.session = liveSession;
          });
          ipcRenderer.send('refresh-session', liveSession);
          if (this.sessionChangeCallback && this.session?.user?.id) {
            this.sessionChangeCallback(this.session.user.id);
          }
        }
        return 0;
      })
      .catch((error) => {
        // console.log('refresh catch', error);
        this.handleRefreshError(error);
      });
  }

  clearSession() {
    console.log('sign out');
    this.session = null;
    this.supaClient.auth.signOut();
    ipcRenderer.send('clear-session');
  }

  // endregion

  // endregion

  constructor(
    keybindStore: Instance<typeof KeybindStore>,
    historyStore: Instance<typeof HistoryStore>
  ) {
    makeAutoObservable(this);

    this.refreshHandle = null;
    this.supaClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    this.versionString = packageInfo.version;
    this.windowSize = { width: 200, height: 200 };
    this.innerBounds = { x: 0, y: 0, width: 100, height: 100 };
    this.keybindStore = keybindStore;
    this.historyStore = historyStore;
    this.filteredOpenTabs = [];

    ipcRenderer.send('request-session');

    renderOn('session', (_, session) => {
      if (this.refreshHandle) {
        clearInterval(this.refreshHandle);
      }
      this.session = session;
      // DON'T REMOVE THIS REFRESH SESSION
      this.refreshSession(session);
      this.refreshHandle = setInterval(() => {
        // console.log('refresh');
        this.refreshSession(this.session);
      }, 1000 * 60 * 60);
    });
    renderOn('set-bounds', (_, { windowSize, bounds, topPadding }) => {
      runInAction(() => {
        this.windowSize = windowSize;
        this.innerBounds = bounds;
        this.topPadding = topPadding;
      });
    });
    renderOn('set-tab-parent', (_, [rootId, parentId]) => {
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
    renderOn('tabView-created-with-id', (_, [id, parentId]) => {
      runInAction(() => {
        this.createTab(id, parentId);
      });
    });
    renderOn('tab-removed', (_, id) => {
      runInAction(() => {
        this.deleteTab(id);
      });
    });
    renderOn('url-changed', (_, [id, url]) => {
      runInAction(() => {
        this.openTabs[id].url = url;

        const tab = this.openTabs[id];
        if (!tab.title && tab.url.startsWith('file:')) {
          const split = tab.url.split(/[\\/]/);
          this.openTabs[id].title =
            split.length === 0 ? 'file' : split[split.length - 1];
        }
      });
    });
    renderOn('title-updated', (_, [id, title]) => {
      runInAction(() => {
        const tab = this.openTabs[id];
        if (tab.url.startsWith('file:')) {
          const split = tab.url.split(/[\\/]/);
          this.openTabs[id].title =
            split.length === 0 ? 'file' : split[split.length - 1];
        } else {
          this.openTabs[id].title = title;
        }
      });
    });
    renderOn('web-contents-update', (_, [id, canGoBack, canGoForward]) => {
      runInAction(() => {
        this.openTabs[id].canGoBack = canGoBack;
        this.openTabs[id].canGoForward = canGoForward;
      });
    });
    renderOn('access-tab', (_, id) => {
      runInAction(() => {
        this.openTabs[id].lastAccessTime = new Date().getTime();
      });
    });
    renderOn('tab-image-native', (_, [id, thing, saveSnapshot]) => {
      runInAction(() => {
        if (typeof this.openTabs[id] !== 'undefined') {
          this.openTabs[id].image = thing;
        }
        if (saveSnapshot) {
          ipcRenderer.send('save-snapshot');
        }
      });
    });
    renderOn('add-history', (_, entry: HistoryEntry) => {
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
    renderOn('history-search-result', (_, result) => {
      runInAction(() => {
        this.searchResult = result;
      });
    });
    renderOn('open-history-modal', () => {
      runInAction(() => {
        this.View = View.History;
      });
    });
    renderOn('toggle-history-modal', () => {
      runInAction(() => {
        if (this.View !== View.History) {
          this.View = View.History;
        } else {
          this.View = View.Tabs;
        }
      });
    });
    renderOn('toggle-debug-modal', () => {
      runInAction(() => {
        if (this.View !== View.NavigatorDebug) {
          this.View = View.NavigatorDebug;
        } else {
          this.View = View.Tabs;
        }
      });
    });
    renderOn('favicon-updated', (_, [id, favicon]) => {
      runInAction(() => {
        this.openTabs[id].favicon = favicon;
      });
    });
    renderOn('history-cleared', () => {
      runInAction(() => {
        this.historyMap.clear();
        this.searchResult = [];
      });
    });
    renderOn('blur', () => {
      runInAction(() => {
        if (this.View === View.Tabs) {
          this.setUrlText('');
        }
      });
    });
    renderOn('focus-search', () => {
      // if (this.urlText === '') {
      //   return;
      // }

      this.setFocus();
      this.selectText();
    });
    renderOn('focus-main', () => {
      this.bonsaiBoxRef?.current?.focus();
      this.bonsaiBoxRef?.current?.select();
    });
    renderOn('set-pinned', (_, newIsPinned) => {
      runInAction(() => {
        this.isPinned = newIsPinned;
      });
    });
    renderOn('set-window-floating', (_, windowFloating) => {
      runInAction(() => {
        this.windowFloating = windowFloating;
      });
    });
    // renderOn('gesture', (_, { id }) => {
    //   // ipcRenderer.send('log-data', 'render-gesture');
    //   // this.bumpTab(id);
    // });
    renderOn('will-navigate', (_, { id }) => {
      runInAction(() => {
        this.navigatorTabModalSelectedNodeId = '';
        this.navigatorTabModal = [0, 0];
        this.bumpTab(id);
      });
    });
    renderOn('set-seenEmailForm', (_, seenEmailForm) => {
      runInAction(() => {
        this.seenEmailForm = seenEmailForm;
      });
    });
    renderOn('close-tab', (_, tabId) => {
      const neighborId = this.leftOrRightOfTab(tabId);
      if (neighborId) {
        ipcRenderer.send('set-tab', neighborId);
      }
      ipcRenderer.send('remove-tab', tabId);
      ipcRenderer.send('mixpanel-track', 'close tab with hotkey in webview');
    });
    renderOn('tab-was-set', (_, id) => {
      runInAction(() => {
        // this.lastActiveTabId = this.activeTabId;
        this.activeTabId = id;
        if (this.View !== View.Navigator && id !== -1) {
          this.View = View.Navigator;
        }
        // if (this.timeoutHandle !== -1) {
        //   clearTimeout(this.timeoutHandle);
        // }
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        // this.timeoutHandle = setTimeout(() => {
        //   this.bumpTab(id);
        //   this.timeoutHandle = -1;
        // }, 5000);
      });
    });
    renderOn('unset-tab', (_, id) => {
      if (typeof id !== 'undefined') {
        runInAction(() => {
          this.highlightedTabId = id;
        });
      }
    });
    renderOn('select-neighbor-tab', (_, side) => {
      const id = parseInt(this.historyStore.active, 10);
      const neighborTabId = this.ringTabNeighbor(id, side);
      if (typeof neighborTabId !== 'undefined') {
        ipcRenderer.send('set-tab', neighborTabId);
      }
    });
    renderOn('tag-modal-message', (_, [event, data]: [string, never]) => {
      this.processTagModalMessage(event, data);
    });
    renderOn('go-back-view', () => {
      this.navBack();
    });
    renderOn('go-forward-view', () => {
      TabPageStore.navForward();
    });
    renderOn('set-view', (_, view) => {
      runInAction(() => {
        this.View = view;
      });
    });
  }

  navBack() {
    ipcRenderer.send('close-tag-modal');
    const last = this.viewNavStack.pop();
    if (last) {
      const lastView = last[0];
      const lastTabId = last[1];
      const lastTagTitle = last[2];
      const lastFuzzyText = last[3];
      if (lastView === View.Navigator && lastTabId !== -1) {
        ipcRenderer.send('set-tab', lastTabId);
      }
      if (this.view === View.Navigator) {
        ipcRenderer.send('click-main');
      }
      if (lastView === View.TagView) {
        (async () => {
          if (!this.database) {
            return;
          }

          const tag = await getTag(this.database, lastTagTitle);
          if (tag) {
            this.setViewingTag(tag, false);
          }
        })();
      }
      this.setView(lastView, false);
      if (lastView === View.FuzzySearch && lastFuzzyText) {
        this.setUrlText(lastFuzzyText);
      }
    }
  }

  static navForward() {
    // separate forward stack or maybe keep index in nav stack
    ipcRenderer.send('log-data', 'todo: go forward');
  }

  tagModalInput = '';

  tagModalData: TagModalData = {
    tagListInfo: [],
    allowCreateNewTag: false,
  };

  // when a tag is checked or unchecked in the tag modal, it will be stored here
  // this will be used to make sure when it is re-rendered it does not move
  // this will be cleared when order is allowed to change like when you type in the input or open/close the modal
  recentlyUsedTagOldCheckedValue: Record<string, boolean> = {};

  // used to track the last created tag so it can stay at the bottom of the page once created
  recentlyCreatedTagTitle = '';

  processTagModalMessage(event: string, data: never) {
    switch (event) {
      case 'tag-input-change':
        this.tagModalInput = data;
        this.recentlyUsedTagOldCheckedValue = {};
        this.recentlyCreatedTagTitle = '';
        this.sendTagModalData();
        break;
      case 'pressed-ctrl-enter':
      case 'd':
      case 'pressed-escape':
      case 'click-background':
        ipcRenderer.send('close-tag-modal');
        break;
      case 'clicked-tag-entry':
        this.clickTagEntry(data);
        break;
      case 'clicked-create-tag':
        this.clickCreateTag(data);
        break;
      case 'go-to-tag':
      case 'pressed-shift-enter':
        this.goToTag(data);
        break;
      default:
        ipcRenderer.send('log-data', `unknown tag modal event: ${event}`);
        break;
    }
  }

  async goToTag(tagTitle: string) {
    ipcRenderer.send('close-tag-modal');
    if (this.database) {
      const tag = await getTag(this.database, tagTitle);
      if (tag) {
        this.setViewingTag(tag);
      }
    }
  }

  openTag(tag: TagModel) {
    ipcRenderer.send('click-main');
    this.View = View.TagView;
    this.setViewingTag(tag);
  }

  getModalTab() {
    let tab;
    if (this.View === View.Navigator) {
      tab = this.openTabs[this.activeTabId.toString()];
    }
    if (!tab) {
      return null;
    }
    return tab;
  }

  clickTagEntry(tagEntry: { checked: boolean; title: string }) {
    if (!this.database) {
      return;
    }

    const possible = this.getModalTab();
    const tab = possible || this.selectedForTagTab;
    if (!tab) {
      return;
    }

    // if it was already in the recently used, then this means we are toggling it back to its original value, so just remove the entry
    if (tagEntry.title in this.recentlyUsedTagOldCheckedValue) {
      delete this.recentlyUsedTagOldCheckedValue[tagEntry.title];
    } else {
      this.recentlyUsedTagOldCheckedValue[tagEntry.title] = tagEntry.checked;
    }

    const pageBaseUrl = baseUrl(tab.url);

    if (tagEntry.checked) {
      removeTagStrings(this.database, pageBaseUrl, tagEntry.title);
    } else {
      addTagStrings(this.database, pageBaseUrl, tagEntry.title, {
        title: tab.title,
        favicon: tab.favicon,
      });
    }
  }

  clickCreateTag(tagTitle: string) {
    if (!this.database) {
      return;
    }

    const possible = this.getModalTab();
    const tab = possible || this.selectedForTagTab;
    if (!tab) {
      return;
    }

    this.recentlyCreatedTagTitle = tagTitle;

    const pageBaseUrl = baseUrl(tab.url);

    addTagStrings(this.database, pageBaseUrl, tagTitle, {
      title: tab.title,
      favicon: tab.favicon,
    });
  }

  sendTagModalData() {
    ipcRenderer.send('set-tag-modal-data', toJS(this.tagModalData));
  }
}

interface IContext {
  tabPageStore: TabPageStore;
  historyStore: Instance<typeof HistoryStore>;
  workspaceStore: Instance<typeof WorkspaceStore>;
  keybindStore: Instance<typeof KeybindStore>;
  tabStore: TabStore;
  database: Database;
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
