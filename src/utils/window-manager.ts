/* eslint no-console: off */
import { BrowserView, BrowserWindow, screen } from 'electron';
import TabView from './tab-view';
import {
  FIND_HTML,
  INDEX_HTML,
  OVERLAY_HTML,
  URL_PEEK_HTML,
} from '../constants';
import { validURL, windowHasView } from './utils';
import { handleFindText } from './windows';

const updateWebContents = (
  event: Electron.IpcMainEvent,
  id: number,
  tabView: TabView
) => {
  event.reply('web-contents-update', [
    id,
    tabView.view.webContents.canGoBack(),
    tabView.view.webContents.canGoForward(),
    tabView.view.webContents.getURL(),
  ]);
};

function makeTitleBar() {
  const titleBarView = new BrowserView({
    webPreferences: {
      nodeIntegration: true,
    },
  });
  titleBarView.webContents.loadURL(INDEX_HTML);
  return titleBarView;
}

function makeUrlPeekView() {
  const urlPeekView = new BrowserView({
    webPreferences: {
      nodeIntegration: true,
    },
  });
  urlPeekView.webContents.loadURL(URL_PEEK_HTML);
  return urlPeekView;
}

function makeFindView() {
  const findView = new BrowserView({
    webPreferences: {
      nodeIntegration: true,
    },
  });
  findView.webContents.loadURL(FIND_HTML);
  return findView;
}

function makeOverlayView() {
  const overlayView = new BrowserView({
    webPreferences: {
      nodeIntegration: true,
    },
  });
  overlayView.webContents.loadURL(OVERLAY_HTML);
  return overlayView;
}

export default class WindowManager {
  allTabViews: Record<number, TabView> = {};

  activeTabId = -1;

  findText = '';

  lastFindTextSearch = '';

  movingWindow = false;

  mainWindow: BrowserWindow;

  titleBarView: BrowserView;

  urlPeekView: BrowserView;

  findView: BrowserView;

  overlayView: BrowserView;

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;

    this.titleBarView = makeTitleBar();
    this.mainWindow.setBrowserView(this.titleBarView);
    this.mainWindow.setTopBrowserView(this.titleBarView);

    this.urlPeekView = makeUrlPeekView();

    this.findView = makeFindView();
    // findView does not show up from Ctrl+F unless you do this for some reason
    mainWindow.addBrowserView(this.findView);
    mainWindow.setTopBrowserView(this.findView);
    mainWindow.removeBrowserView(this.findView);

    this.overlayView = makeOverlayView();
  }

  resetTextSearch() {
    this.lastFindTextSearch = '';
  }

  reloadTab(id: number) {
    this.allTabViews[id].view.webContents.reload();
  }

  createNewTab(id: number, browserPadding: number) {
    this.allTabViews[id] = new TabView(
      this.mainWindow,
      id,
      this.titleBarView,
      this.urlPeekView,
      this.findView,
      browserPadding
    );
  }

  removeTab(id: number, event: Electron.IpcMainEvent) {
    const tabView = this.allTabViews[id];
    if (typeof tabView === 'undefined') {
      throw new Error(`remove-tab: tab with id ${id} does not exist`);
    }
    this.mainWindow.removeBrowserView(tabView.view);
    this.activeTabId = -1;
    this.closeFind();
    if (windowHasView(this.mainWindow, this.urlPeekView)) {
      this.mainWindow.removeBrowserView(this.urlPeekView);
    }
    // eslint-disable-line
    (tabView.view.webContents as any).destroy();
    delete this.allTabViews[id];
    event.reply('tab-removed', id);
  }

  closeFind() {
    if (windowHasView(this.mainWindow, this.findView)) {
      this.mainWindow.removeBrowserView(this.findView);
      const tabView = this.allTabViews[this.activeTabId];
      if (typeof tabView !== 'undefined') {
        tabView.view.webContents.stopFindInPage('clearSelection');
        this.resetTextSearch();
      }
    }
  }

  setTab(id: number, oldId: number) {
    if (id === oldId) {
      return;
    }

    const oldTabView = this.allTabViews[oldId];
    if (typeof oldTabView !== 'undefined') {
      this.mainWindow.removeBrowserView(oldTabView.view);
      this.activeTabId = -1;
    }

    if (id === -1) {
      return;
    }
    const tabView = this.allTabViews[id];
    if (typeof tabView === 'undefined') {
      throw new Error(`setTab: tab with id ${id} does not exist`);
    }

    this.mainWindow.addBrowserView(tabView.view);
    this.activeTabId = id;
    this.mainWindow.setTopBrowserView(this.titleBarView);
    this.closeFind();
    if (windowHasView(this.mainWindow, this.urlPeekView)) {
      this.mainWindow.setTopBrowserView(this.urlPeekView);
    }
    tabView.resize();
  }

  loadUrlInTab(id: number, url: string, event: Electron.IpcMainEvent) {
    if (id === -1 || url === '') {
      return;
    }
    const tabView = this.allTabViews[id];
    if (typeof tabView === 'undefined') {
      throw new Error(
        `load-url-in-active-tab: tab with id ${id} does not exist`
      );
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
      this.closeFind();
      event.reply('url-changed', [id, newUrl]);
      updateWebContents(event, id, tabView);
    })();
  }

  tabBack(id: number, event: Electron.IpcMainEvent) {
    if (this.allTabViews[id].view.webContents.canGoBack()) {
      this.closeFind();
      this.allTabViews[id].view.webContents.goBack();
    }
    updateWebContents(event, id, this.allTabViews[id]);
  }

  tabForward(id: number, event: Electron.IpcMainEvent) {
    if (this.allTabViews[id].view.webContents.canGoForward()) {
      this.closeFind();
      this.allTabViews[id].view.webContents.goForward();
    }
    updateWebContents(event, id, this.allTabViews[id]);
  }

  tabRefresh(id: number) {
    this.closeFind();
    this.reloadTab(id);
  }

  findTextChange(boxText: string) {
    this.findText = boxText;
    const tabView = this.allTabViews[this.activeTabId];
    if (typeof tabView !== 'undefined') {
      this.lastFindTextSearch = handleFindText(
        tabView.view,
        this.findText,
        this.lastFindTextSearch
      );
    }
  }

  findPrevious() {
    const tabView = this.allTabViews[this.activeTabId];
    if (typeof tabView !== 'undefined') {
      this.lastFindTextSearch = handleFindText(
        tabView.view,
        this.findText,
        this.lastFindTextSearch,
        true
      );
    }
  }

  findNext() {
    const tabView = this.allTabViews[this.activeTabId];
    if (typeof tabView !== 'undefined') {
      this.lastFindTextSearch = handleFindText(
        tabView.view,
        this.findText,
        this.lastFindTextSearch
      );
    }
  }

  windowMoved() {
    this.movingWindow = false;
  }

  windowMoving(mouseX: number, mouseY: number) {
    const { x, y } = screen.getCursorScreenPoint();
    this.mainWindow.setPosition(x - mouseX, y - mouseY);
    this.movingWindow = true;
  }
}
