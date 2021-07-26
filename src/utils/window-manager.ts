/* eslint no-console: off */
import {
  BrowserView,
  BrowserWindow,
  Display,
  NativeImage,
  screen,
  shell,
} from 'electron';
// eslint-disable-next-line import/no-cycle
import TabView, { headerHeight } from './tab-view';
import {
  FIND_HTML,
  INDEX_HTML,
  OVERLAY_HTML,
  TAB_PAGE,
  URL_PEEK_HTML,
} from '../constants';
import { validURL, windowHasView } from './utils';
import { handleFindText } from './windows';
// eslint-disable-next-line import/no-cycle
import calculateWindowTarget from './calculate-window-target';

const glMatrix = require('gl-matrix');
const Fuse = require('fuse.js');

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
  // newView.webContents.setZoomLevel(1);
  // newView.webContents.setZoomFactor(1);
  newView.webContents.loadURL(loadURL);
  return newView;
}

export default class WindowManager {
  browserPadding = 35.0;

  windowFloating = false;

  allTabViews: Record<number, TabView> = {};

  // tabId = 0; // auto increment to give unique id to each tab

  activeTabId = -1;

  findText = '';

  lastFindTextSearch = '';

  movingWindow = false;

  mainWindow: BrowserWindow;

  titleBarView: BrowserView;

  urlPeekView: BrowserView;

  findView: BrowserView;

  overlayView: BrowserView;

  tabPageView: BrowserView;

  static display: Display;

  windowPosition = glMatrix.vec2.create();

  windowVelocity = glMatrix.vec2.create();

  windowSize = { width: 0, height: 0 };

  history = new Fuse([], { keys: ['url', 'title', 'openGraphData.title'] });

  lastHistoryAdd = '';

  historyModalActive = false;

  removedTabsStack: string[][] = [];

  constructor(mainWindow: BrowserWindow, display: Display) {
    this.mainWindow = mainWindow;
    WindowManager.display = display;

    this.mainWindow.webContents.on('new-window', (event, url) => {
      event.preventDefault();
      // todo: this should open new tab?
      shell.openExternal(url);
    });

    this.mainWindow.on('resize', this.resize);

    // this.mainWindow.webContents.openDevTools({ mode: 'detach' });

    this.titleBarView = makeView(INDEX_HTML);
    // this.titleBarView.webContents.openDevTools({ mode: 'detach' });
    // this.titleBarView.webContents.on('did-finish-load', () => {
    //   this.mainWindow.focus();
    //   this.titleBarView.webContents.focus();
    //   this.createNewTab();
    // });
    // this.mainWindow.addBrowserView(this.titleBarView);
    // this.mainWindow.setBrowserView(this.titleBarView);
    // this.mainWindow.setTopBrowserView(this.titleBarView);

    this.urlPeekView = makeView(URL_PEEK_HTML);
    this.findView = makeView(FIND_HTML);
    this.overlayView = makeView(OVERLAY_HTML);

    this.tabPageView = makeView(TAB_PAGE);
    this.mainWindow.setBrowserView(this.tabPageView);
    // if (!app.isPackaged) {
    this.tabPageView.webContents.openDevTools({ mode: 'detach' });
    // }

    this.resize();
  }

  updateMainWindowBounds() {
    let x = Math.round(this.windowPosition[0]);
    // why do you do this to me JavaScript?
    if (Object.is(x, -0)) {
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
    this.allTabViews[id]?.view.webContents.reload();
  }

  createNewTab(): number {
    // this.tabId += 1;
    const newTabView = new TabView(
      this.mainWindow,
      this.titleBarView,
      this.urlPeekView,
      this.findView,
      this.browserPadding,
      this
    );
    const { id } = newTabView;
    this.allTabViews[id] = newTabView;
    this.titleBarView.webContents.send('tabView-created-with-id', id);
    this.tabPageView.webContents.send('tabView-created-with-id', id);
    return id;
  }

  removeTab(id: number) {
    const tabView = this.allTabViews[id];
    if (typeof tabView === 'undefined') {
      throw new Error(`remove-tab: tab with id ${id} does not exist`);
    }
    this.mainWindow.removeBrowserView(tabView.view);
    if (id === this.activeTabId) {
      this.setTab(-1);
    }
    this.closeFind();
    this.mainWindow.removeBrowserView(this.urlPeekView);
    // eslint-disable-line
    (tabView.view.webContents as any).destroy();
    delete this.allTabViews[id];
    this.titleBarView.webContents.send('tab-removed', id);
    this.tabPageView.webContents.send('tab-removed', id);
  }

  removeTabs(ids: number[]) {
    if (ids.length === 0) {
      return;
    }

    const urls = ids.map((id) => {
      return this.allTabViews[id].view.webContents.getURL();
    });
    this.removedTabsStack.push(urls);
    for (let i = 0; i < ids.length; i += 1) {
      this.removeTab(ids[i]);
    }
  }

  undoRemovedTabs() {
    if (this.removedTabsStack.length === 0) {
      return;
    }

    const urls = this.removedTabsStack.pop();
    if (typeof urls === 'undefined') {
      return;
    }

    // this.tabPageView.webContents.send('close-history-modal');
    for (let i = 0; i < urls.length; i += 1) {
      // const newTabId = this..createNewTab();
      // this.loadUrlInTab(newTabId, url, event);
    }
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

  setTab(id: number, shouldScreenshot = true) {
    const oldTabView = this.allTabViews[this.activeTabId];
    if (
      shouldScreenshot &&
      shouldScreenshot.valueOf() &&
      id !== this.activeTabId &&
      typeof oldTabView !== 'undefined'
    ) {
      if (id === -1) {
        this.mainWindow.addBrowserView(this.tabPageView);
        this.mainWindow.setTopBrowserView(this.tabPageView);
        this.tabPageView.webContents.focus();
        this.tabPageView.webContents.send('focus-search');
        this.resize();
      }
      ((cachedId: number) => {
        oldTabView.view.webContents
          .capturePage()
          .then((image: NativeImage) => {
            const imgString = image.toDataURL();
            this.tabPageView.webContents.send('tab-image', [
              cachedId,
              imgString,
            ]);
            this.setTab(id, false);
            return null;
          })
          .catch((e) => {
            console.log(e);
            this.setTab(id, false);
          });
      })(this.activeTabId);
      return;
    }

    if (id === -1) {
      this.mainWindow.setBrowserView(this.tabPageView);
      this.tabPageView.webContents.focus();
      this.tabPageView.webContents.send('focus-search');
    }

    if (id === this.activeTabId) {
      return;
    }

    this.activeTabId = id;

    if (typeof oldTabView !== 'undefined') {
      this.mainWindow.removeBrowserView(oldTabView.view);
    }

    if (id === -1) {
      this.mainWindow.webContents.send('set-active', false);
      this.resize();
      return;
    }
    this.mainWindow.webContents.send('set-active', true);
    const tabView = this.allTabViews[id];
    if (typeof tabView === 'undefined') {
      throw new Error(`setTab: tab with id ${id} does not exist`);
    }

    this.mainWindow.setBrowserView(this.titleBarView);

    this.mainWindow.addBrowserView(tabView.view);
    this.activeTabId = id;
    this.titleBarView.webContents.send('tab-was-set', id);

    if (windowHasView(this.mainWindow, this.tabPageView)) {
      this.mainWindow.removeBrowserView(this.tabPageView);
    }

    this.closeFind();

    if (windowHasView(this.mainWindow, this.urlPeekView)) {
      this.mainWindow.setTopBrowserView(this.urlPeekView);
    }

    this.tabPageView.webContents.send('access-tab', id);

    this.resize();
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
    if (!this.allTabViews[id]) {
      return;
    }
    if (this.allTabViews[id].view.webContents.canGoBack()) {
      this.closeFind();
      this.allTabViews[id].view.webContents.goBack();
    }
    updateWebContents(event, id, this.allTabViews[id]);
  }

  tabForward(id: number, event: Electron.IpcMainEvent) {
    if (!this.allTabViews[id]) {
      return;
    }
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

  targetWindowPosition = glMatrix.vec2.create();

  windowSpeeds: number[][] = [];

  static dragThresholdSquared = 5 * 5;

  windowMoving(mouseX: number, mouseY: number) {
    this.movingWindow = true;
    const { x, y } = screen.getCursorScreenPoint();
    const currentTime = new Date().getTime() / 1000.0;

    const speedAverageRange = 0.1;
    this.windowSpeeds.push([currentTime, x, y]);
    while (
      this.windowSpeeds.length > 0 &&
      currentTime - this.windowSpeeds[0][0] > speedAverageRange
    ) {
      this.windowSpeeds.shift();
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
    let setTarget = false;
    let firstTarget: number[] | null = null;
    let firstVelocity: number[] | null = null;
    let i = this.windowSpeeds.length - 1;
    while (i >= 1) {
      const current = this.windowSpeeds[i];
      const last = this.windowSpeeds[i - 1];
      const [
        valid,
        hasVelocity,
        target,
        windowVelocity,
      ] = calculateWindowTarget(
        current[0],
        last[0],
        current[1],
        current[2],
        last[1],
        last[2],
        this.windowSize,
        this.windowPosition
      );

      if (firstTarget === null && valid) {
        firstTarget = target;
        firstVelocity = windowVelocity;
      }

      if (valid && hasVelocity) {
        // eslint-disable-next-line prefer-destructuring
        this.targetWindowPosition[0] = target[0];
        // eslint-disable-next-line prefer-destructuring
        this.targetWindowPosition[1] = target[1];

        // eslint-disable-next-line prefer-destructuring
        this.windowVelocity[0] = windowVelocity[0];
        // eslint-disable-next-line prefer-destructuring
        this.windowVelocity[1] = windowVelocity[1];

        setTarget = true;
        break;
      }

      i -= 1;
    }

    if (!setTarget && firstTarget !== null && firstVelocity !== null) {
      // eslint-disable-next-line prefer-destructuring
      this.targetWindowPosition[0] = firstTarget[0];
      // eslint-disable-next-line prefer-destructuring
      this.targetWindowPosition[1] = firstTarget[1];

      // eslint-disable-next-line prefer-destructuring
      this.windowVelocity[0] = firstVelocity[0];
      // eslint-disable-next-line prefer-destructuring
      this.windowVelocity[1] = firstVelocity[1];
    }

    this.startMouseX = null;
    this.startMouseY = null;
    this.lastX = null;
    this.lastY = null;
    this.windowSpeeds = [];
    this.movingWindow = false;
    if (this.validFloatingClick) {
      this.unFloat(WindowManager.display);
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
    // if (windowHasView(this.mainWindow, this.tabPageView)) {
    //   this.mainWindow?.removeBrowserView(this.tabPageView);
    // }
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
    this.windowSize.width = display.workAreaSize.width;
    this.windowSize.height = display.workAreaSize.height - 1; // todo: without the -1, everything breaks!!??!?
    this.updateMainWindowBounds();

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
    this.tabPageView.setBounds({
      x: padding,
      y: padding,
      width: windowSize[0] - padding * 2,
      height: windowSize[1] - padding * 2,
    });

    Object.values(this.allTabViews).forEach((tabView) => {
      tabView.resize();
    });
  }
}
