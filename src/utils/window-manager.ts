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

const glMatrix = require('gl-matrix');

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
      contextIsolation: false, // todo: do we need this? security concern?
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

  display: Display;

  windowPosition = glMatrix.vec2.create();

  windowVelocity = glMatrix.vec2.create();

  windowSize = { width: 0, height: 0 };

  constructor(mainWindow: BrowserWindow, display: Display) {
    this.mainWindow = mainWindow;
    this.display = display;

    this.mainWindow.webContents.on('new-window', (event, url) => {
      event.preventDefault();
      // todo: this should open new tab?
      shell.openExternal(url);
    });

    // todo: turned this off because it had a runtime exception
    this.mainWindow.on('resize', this.resize);

    this.titleBarView = makeView(INDEX_HTML);
    this.titleBarView.webContents.on('did-finish-load', () => {
      this.mainWindow.focus();
      this.titleBarView.webContents.focus();
      this.titleBarView.webContents.send('create-new-tab');
    });
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

  updateMainWindowBounds() {
    let x = Math.round(this.windowPosition[0]);
    if (Object.is(x, -0)) {
      // why do you do this to me JavaScript?
      x = 0;
    }
    let y = Math.round(this.windowPosition[1]);
    if (Object.is(y, -0)) {
      y = 0;
    }
    const rect = {
      x,
      y,
      width: Math.round(this.windowSize.width),
      height: Math.round(this.windowSize.height),
    };
    try {
      this.mainWindow.setBounds(rect);
    } catch {
      // console.log(e);
      console.log(
        `updateMainWindowBounds error with rect: ${JSON.stringify(rect)}`
      );
    }
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

  startMouseX: number | null = null;

  startMouseY: number | null = null;

  lastX: number | null = null;

  lastY: number | null = null;

  validFloatingClick = false;

  lastTime = 0;

  static dragThresholdSquared = 5 * 5;

  windowMoving(mouseX: number, mouseY: number) {
    this.movingWindow = true;
    const { x, y } = screen.getCursorScreenPoint();
    const currentTime = new Date().getTime() / 1000.0;
    if (this.lastX !== null && this.lastY !== null) {
      const deltaTime = currentTime - this.lastTime;
      const multiple = 1 / deltaTime;
      const augment = 0.75;
      this.windowVelocity[0] = (x - this.lastX) * multiple * augment;
      this.windowVelocity[1] = (y - this.lastY) * multiple * augment;
      const maxSpeed = 3500;
      if (glMatrix.vec2.len(this.windowVelocity) > maxSpeed) {
        glMatrix.vec2.normalize(this.windowVelocity, this.windowVelocity);
        glMatrix.vec2.scale(this.windowVelocity, this.windowVelocity, maxSpeed);
      }
    }
    this.lastTime = currentTime;
    this.lastX = x;
    this.lastY = y;
    if (this.startMouseX === null || this.startMouseY === null) {
      this.startMouseX = x;
      this.startMouseY = y;
      this.validFloatingClick = true;
    }

    const xDif = this.startMouseX - x;
    const yDif = this.startMouseY - y;
    const distSquared = xDif * xDif + yDif * yDif;

    if (
      distSquared > WindowManager.dragThresholdSquared ||
      !this.validFloatingClick
    ) {
      if (this.validFloatingClick) {
        this.startMouseX = xDif;
        this.startMouseY = yDif;
        this.validFloatingClick = false;
      }
      this.windowPosition[0] = x - mouseX + this.startMouseX;
      this.windowPosition[1] = y - mouseY + this.startMouseY;
      this.updateMainWindowBounds();
    }
  }

  windowMoved() {
    this.startMouseX = null;
    this.startMouseY = null;
    this.lastX = null;
    this.lastY = null;
    this.movingWindow = false;
    if (this.validFloatingClick) {
      this.unFloat(this.display);
    }
    this.validFloatingClick = false;
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
    this.windowPosition[0] =
      display.workAreaSize.width / 2.0 - floatingWidth / 2.0;
    this.windowPosition[1] =
      display.workAreaSize.height / 2.0 - floatingHeight / 2.0;
    this.windowSize.width = floatingWidth;
    this.windowSize.height = floatingHeight;
    this.windowVelocity[0] = 0;
    this.windowVelocity[1] = 0;
    this.updateMainWindowBounds();

    this.mainWindow.webContents.send('set-padding', '');

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
    this.windowPosition[0] = 0;
    this.windowPosition[1] = 0;
    this.windowSize.width = display.workAreaSize.width - 1; // todo: without the -1, everything breaks!!??!?
    this.windowSize.height = display.workAreaSize.height - 1;
    this.updateMainWindowBounds();

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
    const padding = this.windowFloating ? 10 : this.browserPadding;
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
