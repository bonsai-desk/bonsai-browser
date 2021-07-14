/* eslint no-console: off */
import { BrowserView, BrowserWindow, Display, screen, shell } from 'electron';
// eslint-disable-next-line import/no-cycle
import TabView, { headerHeight } from './tab-view';
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

function makeView(loadURL: string) {
  const newView = new BrowserView({
    webPreferences: {
      nodeIntegration: true,
    },
  });
  newView.webContents.loadURL(loadURL);
  return newView;
}

export default class WindowManager {
  browserPadding = 35.0;

  windowFloating = false;

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

    this.mainWindow.webContents.on('new-window', (event, url) => {
      event.preventDefault();
      // todo: this should open new tab?
      shell.openExternal(url);
    });

    // todo: turned this off because it had a runtime exception
    this.mainWindow.on('resize', this.resize);

    this.titleBarView = makeView(INDEX_HTML);
    this.mainWindow.setBrowserView(this.titleBarView);
    this.mainWindow.setTopBrowserView(this.titleBarView);

    this.urlPeekView = makeView(URL_PEEK_HTML);

    this.findView = makeView(FIND_HTML);
    // findView does not show up from Ctrl+F unless you do this for some reason
    // mainWindow.addBrowserView(this.findView);
    // mainWindow.setTopBrowserView(this.findView);
    // mainWindow.removeBrowserView(this.findView);

    this.overlayView = makeView(OVERLAY_HTML);
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
      browserPadding,
      this
    );
  }

  removeTab(id: number) {
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
    this.titleBarView.webContents.send('tab-removed', id);
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

    this.mainWindow.webContents.send(
      'set-active',
      tabView.view.webContents.getURL() !== ''
    );
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
      this.mainWindow.webContents.send('set-active', newUrl !== '');
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

  clickFind() {
    if (
      this.mainWindow !== null &&
      !windowHasView(this.mainWindow, this.findView)
    ) {
      this.mainWindow.addBrowserView(this.findView);
      this.mainWindow.setTopBrowserView(this.findView);
      this.resize();
    }

    const tabView = this.allTabViews[this.activeTabId];
    if (typeof tabView !== 'undefined') {
      this.findView.webContents.focus();
      this.findView.webContents.send('open-find');
      handleFindText(tabView.view, this.findText, this.lastFindTextSearch);
    }
  }

  float(display: Display, floatingWidth: number, floatingHeight: number) {
    if (this.windowFloating) {
      return;
    }

    this.windowFloating = true;
    // snap to corner mode
    if (!windowHasView(this.mainWindow, this.overlayView)) {
      this.mainWindow?.addBrowserView(this.overlayView);
      this.mainWindow?.setTopBrowserView(this.overlayView);
    }
    if (windowHasView(this.mainWindow, this.titleBarView)) {
      this.mainWindow?.removeBrowserView(this.titleBarView);
    }
    this.mainWindow?.setBounds({
      x: Math.round(display.workAreaSize.width / 2.0 - floatingWidth / 2.0),
      y: Math.round(display.workAreaSize.height / 2.0 - floatingHeight / 2.0),
      width: floatingWidth,
      height: floatingHeight,
    });

    this.mainWindow.webContents.send('set-padding', '5');

    Object.values(this.allTabViews).forEach((tabView) => {
      tabView.windowFloating = this.windowFloating;
      tabView.resize();
    });

    this.resize();
  }

  unFloat(display: Display) {
    if (!this.windowFloating) {
      return;
    }

    this.windowFloating = false;
    this.mainWindow?.setBounds({
      x: 0,
      y: 0,
      width: display.workAreaSize.width - 1, // todo: without the -1, everything breaks!!??!?
      height: display.workAreaSize.height - 1,
    });

    // black border mode
    if (windowHasView(this.mainWindow, this.overlayView)) {
      this.mainWindow?.removeBrowserView(this.overlayView);
    }
    if (!windowHasView(this.mainWindow, this.titleBarView)) {
      this.mainWindow?.addBrowserView(this.titleBarView);
      this.mainWindow?.setTopBrowserView(this.titleBarView);
    }

    this.mainWindow.webContents.send(
      'set-padding',
      this.browserPadding.toString()
    );

    Object.values(this.allTabViews).forEach((tabView) => {
      tabView.windowFloating = this.windowFloating;
      tabView.resize();
    });

    this.resize();
  }

  toggleFloat(display: Display, floatingWidth: number, floatingHeight: number) {
    if (this.windowFloating) {
      this.unFloat(display);
    } else {
      this.float(display, floatingWidth, floatingHeight);
    }
  }

  resize() {
    if (this.mainWindow === null || typeof this.mainWindow === 'undefined') {
      return;
    }
    const padding = this.windowFloating ? 5 : this.browserPadding;
    const hh = this.windowFloating ? 0 : headerHeight;
    const windowSize = this.mainWindow.getSize();

    const urlPeekWidth = 475;
    const urlPeekHeight = 20;

    const findViewWidth = 350;
    const findViewHeight = 50;
    const findViewMarginRight = 20;

    this.titleBarView.setBounds({
      x: padding,
      y: padding,
      width: windowSize[0] - padding * 2,
      height: hh,
    });
    this.urlPeekView.setBounds({
      x: padding,
      y: windowSize[1] - urlPeekHeight - padding,
      width: urlPeekWidth,
      height: urlPeekHeight,
    });
    this.findView.setBounds({
      x: windowSize[0] - findViewWidth - findViewMarginRight - padding,
      y: hh + padding,
      width: findViewWidth,
      height: findViewHeight,
    });
    this.overlayView.setBounds({
      x: 0,
      y: 0,
      width: windowSize[0],
      height: windowSize[1],
    });

    Object.values(this.allTabViews).forEach((tabView) => {
      tabView.resize();
    });
  }
}
