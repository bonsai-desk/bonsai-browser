/* eslint no-console: off */
import { BrowserView, BrowserWindow, ipcMain, screen } from 'electron';
import { closeSearch, handleFindText, updateWebContents } from './windows';
import { validURL, windowHasView } from './utils';
import WindowManager from './window-manager';
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

export function removeTab(
  id: number,
  window: Electron.BrowserWindow,
  findView: Electron.BrowserView,
  urlPeekView: Electron.BrowserView,
  event: Electron.IpcMainEvent,
  windowManager: WindowManager
) {
  const tabView = windowManager.allTabViews[id];
  if (typeof tabView === 'undefined') {
    throw new Error(`remove-tab: tab with id ${id} does not exist`);
  }
  window.removeBrowserView(tabView.view);
  windowManager.activeTabId = -1;
  closeFind(window, findView, windowManager);
  if (windowHasView(window, urlPeekView)) {
    window.removeBrowserView(urlPeekView);
  }
  // eslint-disable-line
  (tabView.view.webContents as any).destroy();
  delete windowManager.allTabViews[id];
  event.reply('tab-removed', id);
}

export function loadUrlInTab(
  id: number,
  url: string,
  event: Electron.IpcMainEvent,
  window: Electron.BrowserWindow,
  findView: Electron.BrowserView,
  windowManager: WindowManager
) {
  if (id === -1 || url === '') {
    return;
  }
  const tabView = windowManager.allTabViews[id];
  if (typeof tabView === 'undefined') {
    throw new Error(`load-url-in-active-tab: tab with id ${id} does not exist`);
  }
  let fullUrl = url;
  if (!/^https?:\/\//i.test(url)) {
    fullUrl = `http://${url}`;
  }

  // url is invalid
  if (!validURL(fullUrl)) {
    fullUrl = `https://www.google.com/search?q=${url}`;
  }

  event.reply('web-contents-update', [id, true, false, fullUrl]);

  (async () => {
    await tabView.view.webContents.loadURL(fullUrl).catch(() => {
      // failed to load url
      // todo: handle this
      console.log(`error loading url: ${fullUrl}`);
    });
    const newUrl = tabView.view.webContents.getURL();
    closeFind(window, findView, windowManager);
    event.reply('url-changed', [id, newUrl]);
    updateWebContents(event, id, tabView);
  })();
}

export function tabBack(
  id: number,
  window: Electron.BrowserWindow,
  findView: Electron.BrowserView,
  event: Electron.IpcMainEvent,
  windowManager: WindowManager
) {
  if (windowManager.allTabViews[id].view.webContents.canGoBack()) {
    closeFind(window, findView, windowManager);
    windowManager.allTabViews[id].view.webContents.goBack();
  }
  updateWebContents(event, id, windowManager.allTabViews[id]);
}

export function tabForward(
  id: number,
  window: Electron.BrowserWindow,
  findView: Electron.BrowserView,
  event: Electron.IpcMainEvent,
  windowManager: WindowManager
) {
  if (windowManager.allTabViews[id].view.webContents.canGoForward()) {
    closeFind(window, findView, windowManager);
    windowManager.allTabViews[id].view.webContents.goForward();
  }
  updateWebContents(event, id, windowManager.allTabViews[id]);
}

export function tabRefresh(
  window: Electron.BrowserWindow,
  findView: Electron.BrowserView,
  id: number,
  windowManager: WindowManager
) {
  closeFind(window, findView, windowManager);
  windowManager.allTabViews[id].view.webContents.reload();
}

export function findTextChange(boxText: string, windowManager: WindowManager) {
  windowManager.findText = boxText;
  const tabView = windowManager.allTabViews[windowManager.activeTabId];
  if (typeof tabView !== 'undefined') {
    windowManager.lastFindTextSearch = handleFindText(
      tabView.view,
      windowManager.findText,
      windowManager.lastFindTextSearch
    );
  }
}

export function findPrevious(windowManager: WindowManager) {
  const tabView = windowManager.allTabViews[windowManager.activeTabId];
  if (typeof tabView !== 'undefined') {
    windowManager.lastFindTextSearch = handleFindText(
      tabView.view,
      windowManager.findText,
      windowManager.lastFindTextSearch,
      true
    );
  }
}

export function findNext(windowManager: WindowManager) {
  const tabView = windowManager.allTabViews[windowManager.activeTabId];
  if (typeof tabView !== 'undefined') {
    windowManager.lastFindTextSearch = handleFindText(
      tabView.view,
      windowManager.findText,
      windowManager.lastFindTextSearch
    );
  }
}

export function windowMoved(windowManager: WindowManager) {
  windowManager.movingWindow = false;
}

export function windowMoving(
  mouseX: number,
  mouseY: number,
  windowManager: WindowManager,
  mainWindow: BrowserWindow | null
) {
  const { x, y } = screen.getCursorScreenPoint();
  mainWindow?.setPosition(x - mouseX, y - mouseY);
  windowManager.movingWindow = true;
}

export function addListeners(
  window: BrowserWindow,
  titleBarView: BrowserView,
  urlPeekView: BrowserView,
  findView: BrowserView,
  browserPadding: number,
  wm: WindowManager,
  mainWindow: BrowserWindow
) {
  ipcMain.on('create-new-tab', (_, id) => {
    createNewTab(
      window,
      id,
      titleBarView,
      urlPeekView,
      findView,
      browserPadding,
      wm
    );
  });
  ipcMain.on('remove-tab', (event, id) => {
    removeTab(id, window, findView, urlPeekView, event, wm);
  });
  ipcMain.on('set-tab', (_, [id, oldId]) => {
    setTab(window, titleBarView, urlPeekView, findView, id, oldId, wm);
  });
  ipcMain.on('load-url-in-tab', (event, [id, url]) => {
    loadUrlInTab(id, url, event, window, findView, wm);
  });
  ipcMain.on('tab-back', (event, id) => {
    tabBack(id, window, findView, event, wm);
  });
  ipcMain.on('tab-forward', (event, id) => {
    tabForward(id, window, findView, event, wm);
  });
  ipcMain.on('tab-refresh', (_, id) => {
    tabRefresh(window, findView, id, wm);
  });
  ipcMain.on('close-find', () => {
    closeFind(window, findView, wm);
  });
  ipcMain.on('find-text-change', (_, boxText) => {
    findTextChange(boxText, wm);
  });
  ipcMain.on('find-previous', () => {
    findPrevious(wm);
  });
  ipcMain.on('find-next', () => {
    findNext(wm);
  });
  ipcMain.on('windowMoving', (_, { mouseX, mouseY }) => {
    windowMoving(mouseX, mouseY, wm, mainWindow);
  });
  ipcMain.on('windowMoved', () => {
    windowMoved(wm);
  });
}
