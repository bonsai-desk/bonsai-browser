/* eslint no-console: off */
import { BrowserView, ipcMain, screen } from 'electron';
import { closeSearch, handleFindText, updateWebContents } from './windows';
import { validURL, windowHasView } from './utils';
import WindowManager from './window-manager';
import TabView from './tab-view';

export function closeFind(findView: BrowserView, wm: WindowManager) {
  closeSearch(wm.mainWindow, findView, wm, () => {
    wm.resetTextSearch();
  });
}

export const setTab = (
  id: number,
  titleBarView: Electron.BrowserView,
  urlPeekView: Electron.BrowserView,
  findView: Electron.BrowserView,
  oldId: number,
  windowManager: WindowManager
) => {
  if (id === oldId) {
    return;
  }

  const oldTabView = windowManager.allTabViews[oldId];
  if (typeof oldTabView !== 'undefined') {
    windowManager.mainWindow.removeBrowserView(oldTabView.view);
    windowManager.activeTabId = -1;
  }

  if (id === -1) {
    return;
  }
  const tabView = windowManager.allTabViews[id];
  if (typeof tabView === 'undefined') {
    throw new Error(`setTab: tab with id ${id} does not exist`);
  }

  windowManager.mainWindow.addBrowserView(tabView.view);
  windowManager.activeTabId = id;
  windowManager.mainWindow.setTopBrowserView(titleBarView);
  closeFind(findView, windowManager);
  if (windowHasView(windowManager.mainWindow, urlPeekView)) {
    windowManager.mainWindow.setTopBrowserView(urlPeekView);
  }
  tabView.resize();
};

export function createNewTab(
  id: number,
  titleBarView: Electron.BrowserView,
  urlPeekView: Electron.BrowserView,
  findView: Electron.BrowserView,
  browserPadding: number,
  windowManager: WindowManager
) {
  windowManager.allTabViews[id] = new TabView(
    windowManager.mainWindow,
    id,
    titleBarView,
    urlPeekView,
    findView,
    browserPadding
  );
}

export function removeTab(
  id: number,
  findView: Electron.BrowserView,
  urlPeekView: Electron.BrowserView,
  event: Electron.IpcMainEvent,
  windowManager: WindowManager
) {
  const tabView = windowManager.allTabViews[id];
  if (typeof tabView === 'undefined') {
    throw new Error(`remove-tab: tab with id ${id} does not exist`);
  }
  windowManager.mainWindow.removeBrowserView(tabView.view);
  windowManager.activeTabId = -1;
  closeFind(findView, windowManager);
  if (windowHasView(windowManager.mainWindow, urlPeekView)) {
    windowManager.mainWindow.removeBrowserView(urlPeekView);
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
    closeFind(findView, windowManager);
    event.reply('url-changed', [id, newUrl]);
    updateWebContents(event, id, tabView);
  })();
}

export function tabBack(
  id: number,
  findView: Electron.BrowserView,
  event: Electron.IpcMainEvent,
  windowManager: WindowManager
) {
  if (windowManager.allTabViews[id].view.webContents.canGoBack()) {
    closeFind(findView, windowManager);
    windowManager.allTabViews[id].view.webContents.goBack();
  }
  updateWebContents(event, id, windowManager.allTabViews[id]);
}

export function tabForward(
  id: number,
  findView: Electron.BrowserView,
  event: Electron.IpcMainEvent,
  windowManager: WindowManager
) {
  if (windowManager.allTabViews[id].view.webContents.canGoForward()) {
    closeFind(findView, windowManager);
    windowManager.allTabViews[id].view.webContents.goForward();
  }
  updateWebContents(event, id, windowManager.allTabViews[id]);
}

export function tabRefresh(
  id: number,
  findView: Electron.BrowserView,
  windowManager: WindowManager
) {
  closeFind(findView, windowManager);
  windowManager.reloadTab(id);
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
  windowManager: WindowManager
) {
  const { x, y } = screen.getCursorScreenPoint();
  windowManager.mainWindow.setPosition(x - mouseX, y - mouseY);
  windowManager.movingWindow = true;
}

export function addListeners(
  wm: WindowManager,
  titleBarView: Electron.BrowserView,
  urlPeekView: Electron.BrowserView,
  findView: Electron.BrowserView,
  browserPadding: number
) {
  ipcMain.on('create-new-tab', (_, id) => {
    createNewTab(id, titleBarView, urlPeekView, findView, browserPadding, wm);
  });
  ipcMain.on('remove-tab', (event, id) => {
    removeTab(id, findView, urlPeekView, event, wm);
  });
  ipcMain.on('set-tab', (_, [id, oldId]) => {
    setTab(id, titleBarView, urlPeekView, findView, oldId, wm);
  });
  ipcMain.on('load-url-in-tab', (event, [id, url]) => {
    loadUrlInTab(id, url, event, findView, wm);
  });
  ipcMain.on('tab-back', (event, id) => {
    tabBack(id, findView, event, wm);
  });
  ipcMain.on('tab-forward', (event, id) => {
    tabForward(id, findView, event, wm);
  });
  ipcMain.on('tab-refresh', (_, id) => {
    tabRefresh(id, findView, wm);
  });
  ipcMain.on('close-find', () => {
    closeFind(findView, wm);
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
    windowMoving(mouseX, mouseY, wm);
  });
  ipcMain.on('windowMoved', () => {
    windowMoved(wm);
  });
}
