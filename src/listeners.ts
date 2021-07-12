import { BrowserView, BrowserWindow } from 'electron';
import { closeSearch } from './windows';
import { windowHasView } from './utils';
import { WindowManager } from './window-manager';
import TabView from './tab-view';

export function closeFind(
  window: BrowserWindow,
  findView: BrowserView,
  wm: WindowManager
) {
  closeSearch(window, findView, wm, () => {
    wm.resetTextSearch();
  });
}

export const setTab = (
  window: BrowserWindow,
  titleBarView: BrowserView,
  urlPeekView: BrowserView,
  findView: BrowserView,
  id: number,
  oldId: number,
  windowManger: WindowManager
) => {
  if (id === oldId) {
    return;
  }

  const oldTabView = windowManger.allTabViews[oldId];
  if (typeof oldTabView !== 'undefined') {
    window.removeBrowserView(oldTabView.view);
    windowManger.activeTabId = -1;
  }

  if (id === -1) {
    return;
  }
  const tabView = windowManger.allTabViews[id];
  if (typeof tabView === 'undefined') {
    throw new Error(`setTab: tab with id ${id} does not exist`);
  }

  window.addBrowserView(tabView.view);
  windowManger.activeTabId = id;
  window.setTopBrowserView(titleBarView);
  closeFind(window, findView, windowManger);
  if (windowHasView(window, urlPeekView)) {
    window.setTopBrowserView(urlPeekView);
  }
  tabView.resize();
};

export function createNewTab(
  window: Electron.BrowserWindow,
  id: number,
  titleBarView: Electron.BrowserView,
  urlPeekView: Electron.BrowserView,
  findView: Electron.BrowserView,
  browserPadding: number,
  windowManager: WindowManager
) {
  windowManager.allTabViews[id] = new TabView(
    window,
    id,
    titleBarView,
    urlPeekView,
    findView,
    browserPadding
  );
}
