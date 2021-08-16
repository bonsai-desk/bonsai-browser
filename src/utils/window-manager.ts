/* eslint no-console: off */
import {
  app,
  BrowserView,
  BrowserWindow,
  Display,
  globalShortcut,
  NativeImage,
  screen,
} from 'electron';
import fs from 'fs';
import Fuse from 'fuse.js';
import path from 'path';
// eslint-disable-next-line import/no-cycle
import TabView, { headerHeight, HistoryEntry } from './tab-view';
import {
  FIND_HTML,
  INDEX_HTML,
  OVERLAY_HTML,
  TAB_PAGE,
  URL_PEEK_HTML,
} from '../constants';
// eslint-disable-next-line import/no-cycle
import {
  parseMap,
  stringifyMap,
  stringToUrl,
  urlToMapKey,
  windowHasView,
} from './utils';
// eslint-disable-next-line import/no-cycle
import { handleFindText } from './windows';
// eslint-disable-next-line import/no-cycle
import calculateWindowTarget from './calculate-window-target';

const glMatrix = require('gl-matrix');

const updateWebContents = (
  titleBarView: BrowserView,
  id: number,
  tabView: TabView
) => {
  titleBarView.webContents.send('web-contents-update', [
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

interface TabInfo {
  url: string;

  title: string;

  favicon: string;

  imgString: string;

  scrollHeight: number;
}

export default class WindowManager {
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

  static display: { activeDisplay: Display };

  windowPosition = glMatrix.vec2.create();

  windowVelocity = glMatrix.vec2.create();

  windowSize = { width: 0, height: 0 };

  historyMap = new Map<string, HistoryEntry>();

  historyFuse = new Fuse<HistoryEntry>([], {
    keys: ['url', 'title', 'openGraphData.title'],
  });

  historyModalActive = false;

  removedTabsStack: TabInfo[][] = [];

  isPinned = false;

  loadedOpenTabs = false;

  constructor(mainWindow: BrowserWindow, display: { activeDisplay: Display }) {
    this.mainWindow = mainWindow;
    WindowManager.display = display;

    this.mainWindow.on('resize', this.resize);
    // this.mainWindow.webContents.openDevTools({ mode: 'detach' });

    this.titleBarView = makeView(INDEX_HTML);
    // this.titleBarView.webContents.openDevTools({ mode: 'detach' });

    this.urlPeekView = makeView(URL_PEEK_HTML);
    // this.urlPeekView.webContents.openDevTools({ mode: 'detach' });

    this.findView = makeView(FIND_HTML);
    // this.findView.webContents.openDevTools({ mode: 'detach' });

    this.overlayView = makeView(OVERLAY_HTML);
    // this.overlayView.webContents.openDevTools({ mode: 'detach' });

    this.tabPageView = makeView(TAB_PAGE);
    this.tabPageView.webContents.openDevTools({ mode: 'detach' });

    this.mainWindow.setBrowserView(this.tabPageView);
    this.tabPageView.webContents.on('did-finish-load', () => {
      // we do this so hot reloading does not duplicate tabs
      Object.values(this.allTabViews).forEach((tabView) => {
        this.removeTab(tabView.id);
      });
      this.loadHistory();
    });

    screen.on('display-metrics-changed', (_, changedDisplay) => {
      if (changedDisplay.id === WindowManager.display.activeDisplay.id) {
        WindowManager.display.activeDisplay = changedDisplay;

        if (this.windowFloating) {
          const height80 =
            WindowManager.display.activeDisplay.workAreaSize.height * 0.7;
          const floatingWidth = Math.floor(height80 * 0.7);
          const floatingHeight = Math.floor(height80);
          this.windowSize.width = floatingWidth;
          this.windowSize.height = floatingHeight;
          this.updateMainWindowBounds();
        }
        if (!this.windowFloating) {
          this.unFloat(WindowManager.display.activeDisplay);
        }
        this.resize();

        const target = calculateWindowTarget(
          1,
          0,
          0,
          0,
          0,
          0,
          this.windowSize,
          this.windowPosition
        );
        if (target[0]) {
          // eslint-disable-next-line prefer-destructuring
          this.targetWindowPosition[0] = target[2][0];
          // eslint-disable-next-line prefer-destructuring
          this.targetWindowPosition[1] = target[2][1];
        }
      }
    });

    this.resize();

    setInterval(() => {
      this.saveTabs();
    }, 1000 * 5);

    setInterval(() => {
      this.saveHistory();
    }, 1000 * 60);

    let escapeActive = false;
    setInterval(() => {
      if (mainWindow.isDestroyed()) {
        return;
      }
      let cursorPoint = screen.getCursorScreenPoint();
      const mainWindowVisible = mainWindow.isVisible();
      const webBrowserViewIsActive = this.webBrowserViewActive();
      let mouseIsInBorder = !this.mouseInInner(cursorPoint);
      const findIsActive = this.findActive();
      if (
        !escapeActive &&
        mainWindowVisible &&
        webBrowserViewIsActive &&
        (mouseIsInBorder || findIsActive)
      ) {
        escapeActive = true;
        globalShortcut.register('Escape', () => {
          cursorPoint = screen.getCursorScreenPoint();
          mouseIsInBorder = !this.mouseInInner(cursorPoint);
          this.toggle(mouseIsInBorder);
        });
      } else if (
        escapeActive &&
        (!mainWindowVisible ||
          (mainWindowVisible && webBrowserViewIsActive && !mouseIsInBorder) ||
          (mainWindowVisible && !webBrowserViewIsActive)) &&
        !findIsActive
      ) {
        setTimeout(() => {
          // timeout here because there was sometimes a gap between this being
          // un-registered and the tab page taking over the escape key functionality
          escapeActive = false;
          globalShortcut.unregister('Escape');
        }, 10);
      }
    }, 10);
  }

  webViewActive() {
    return this.activeTabId !== -1;
  }

  setPinned(pinned: boolean) {
    this.isPinned = pinned;
    this.mainWindow.webContents.send('set-pinned', pinned);
    this.tabPageView.webContents.send('set-pinned', pinned);
  }

  mouseInInner(mousePoint: Electron.Point) {
    const bounds = this.innerBounds();
    const padding = this.browserPadding();
    const hh = this.headerHeight();
    const [x0, y0] = this.mainWindow.getPosition();

    const innerX0 = x0 + padding;
    const innerX1 = innerX0 + bounds.width;

    const innerY0 = y0 + padding;
    const innerY1 = innerY0 + hh + bounds.height;

    const inX = innerX0 < mousePoint.x && mousePoint.x < innerX1;
    const inY = innerY0 < mousePoint.y && mousePoint.y < innerY1;

    return inX && inY;
  }

  webBrowserViewActive() {
    return this.activeTabId !== -1;
  }

  browserPadding(): number {
    if (WindowManager.display !== null) {
      const ratio = this.activeTabId === -1 ? 50 : 15;
      return Math.floor(
        WindowManager.display.activeDisplay.workAreaSize.height / ratio
      );
    }
    return 35;
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (tabView.view.webContents as any).destroy();
    delete this.allTabViews[id];
    this.titleBarView.webContents.send('tab-removed', id);
    this.tabPageView.webContents.send('tab-removed', id);
  }

  removeTabs(ids: number[]) {
    if (ids.length === 0) {
      return;
    }

    const tabs = ids.map((id) => {
      const tabView = this.allTabViews[id];
      return {
        url:
          tabView.unloadedUrl === ''
            ? tabView.view.webContents.getURL()
            : tabView.unloadedUrl,
        title: tabView.title,
        favicon: tabView.favicon,
        imgString: tabView.imgString,
        scrollHeight: tabView.scrollHeight,
      };
    });
    this.removedTabsStack.push(tabs);
    for (let i = 0; i < ids.length; i += 1) {
      this.removeTab(ids[i]);
    }
  }

  loadTabFromTabInfo(tab: TabInfo) {
    const { url, title, favicon, imgString, scrollHeight }: TabInfo = tab;
    const newTabId = this.createNewTab();
    const tabView = this.allTabViews[newTabId];
    tabView.title = title;
    this.tabPageView.webContents.send('title-updated', [newTabId, title]);
    tabView.favicon = favicon;
    this.tabPageView.webContents.send('favicon-updated', [newTabId, favicon]);
    tabView.imgString = imgString;
    this.tabPageView.webContents.send('tab-image', [newTabId, imgString]);
    tabView.scrollHeight = scrollHeight;
    this.loadUrlInTab(newTabId, url, true);
  }

  undoRemovedTabs() {
    if (this.removedTabsStack.length === 0) {
      return;
    }

    const tabs = this.removedTabsStack.pop();
    if (typeof tabs === 'undefined') {
      return;
    }

    this.tabPageView.webContents.send('close-history-modal');
    for (let i = 0; i < tabs.length; i += 1) {
      this.loadTabFromTabInfo(tabs[i]);
    }
  }

  addHistoryEntry(entry: HistoryEntry) {
    // if key exists, delete it. it will be added again to the end of the map
    const entryKey = urlToMapKey(entry.url);
    this.historyMap.delete(entryKey);

    // add entry to end of map
    this.historyMap.set(entryKey, entry);

    const keys = this.historyMap.keys();

    let result = keys.next();
    while (!result.done) {
      if (this.historyMap.size < 10000) {
        break;
      }
      this.historyMap.delete(result.value);
      result = keys.next();
    }

    this.historyFuse.remove((removeEntry) => {
      return removeEntry.key === entryKey;
    });
    this.historyFuse.add(entry);
    this.tabPageView.webContents.send('add-history', entry);
  }

  clearHistory() {
    this.historyMap.clear();
    this.historyFuse.setCollection([]);
    this.removedTabsStack = [];
    this.tabPageView.webContents.send('history-cleared');
    this.saveHistory();
  }

  saveHistory() {
    try {
      const savePath = path.join(app.getPath('userData'), 'history.json');
      const saveString = stringifyMap(this.historyMap);
      fs.writeFileSync(savePath, saveString);
      this.saveTabs();
    } catch {
      // console.log('saveHistory error');
      // console.log(e);
    }
  }

  saveTabs() {
    if (!this.loadedOpenTabs) {
      return;
    }
    try {
      const savePath = path.join(app.getPath('userData'), 'openTabs.json');
      const saveData = Object.values(this.allTabViews).map((tabView) => {
        return {
          url:
            tabView.unloadedUrl === ''
              ? tabView.view.webContents.getURL()
              : tabView.unloadedUrl,
          title: tabView.title,
          favicon: tabView.favicon,
          imgString: tabView.imgString,
          scrollHeight: tabView.scrollHeight,
        };
      });
      fs.writeFileSync(savePath, JSON.stringify(saveData));
    } catch {
      //
    }
  }

  loadHistory() {
    try {
      const savePath = path.join(app.getPath('userData'), 'history.json');
      const saveString = fs.readFileSync(savePath, 'utf8');
      const saveMap = parseMap(saveString);
      if (
        saveMap === null ||
        typeof saveMap === 'undefined' ||
        saveMap.delete === null ||
        typeof saveMap.delete === 'undefined'
      ) {
        return;
      }
      this.historyMap = saveMap;

      const saveData = Array.from(saveMap.values());
      this.historyFuse.setCollection(saveData);

      for (
        let i = Math.max(saveData.length - 50, 0);
        i < saveData.length;
        i += 1
      ) {
        if (i >= 0) {
          const entry = saveData[i];
          this.tabPageView.webContents.send('add-history', entry);
        }
      }
      this.loadTabs();
    } catch {
      // console.log('loadHistory error');
      // console.log(e);
    }
  }

  loadTabs() {
    this.loadedOpenTabs = true;
    try {
      const savePath = path.join(app.getPath('userData'), 'openTabs.json');
      const saveString = fs.readFileSync(savePath, 'utf8');
      const saveData = JSON.parse(saveString);

      saveData.forEach((tab: TabInfo) => {
        this.loadTabFromTabInfo(tab);
      });
    } catch {
      //
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

  screenShotTab(tabId: number, tabView: TabView) {
    tabView.view.webContents.send('get-scroll-height');
    console.time('begin capture');
    tabView.view.webContents
      .capturePage()
      .then((image: NativeImage) => {
        console.timeEnd('begin capture');
        console.time('conv jpg');
        const jpgBuf = image.toJPEG(50);
        console.timeEnd('conv jpg');

        // console.time('obj url');
        // const thing = URL.createObjectURL(
        //   new Blob([jpgBuf.buffer], { type: 'image/jpg' })
        // );
        // console.timeEnd('obj url');

        // console.time('assign to tabview');
        // tabView.imgString = thing;
        // console.timeEnd('assign to tabview');

        console.log(jpgBuf);
        console.time('send to main');
        this.tabPageView.webContents.send('tab-image-native', [tabId, jpgBuf]);
        console.timeEnd('send to main');
        return null;
      })
      .catch((e) => {
        console.log(e);
      });
  }

  setTab(id: number, shouldScreenshot = true) {
    const oldTabView = this.allTabViews[this.activeTabId];

    // screenshot page if needed
    if (
      shouldScreenshot &&
      id !== this.activeTabId &&
      typeof oldTabView !== 'undefined'
    ) {
      if (id === -1) {
        // this.mainWindow.addBrowserView(this.tabPageView);
        this.mainWindow.setTopBrowserView(this.tabPageView);
        this.tabPageView.webContents.focus();
        this.tabPageView.webContents.send('focus-search');
        this.resize();
      }
      const cachedId = this.activeTabId;
      console.time('invoke screenshot');
      this.screenShotTab(cachedId, oldTabView);
      console.timeEnd('invoke screenshot');
    }

    // return to main tab page if needed
    if (id === -1) {
      // this.mainWindow.add(this.tabPageView);
      this.mainWindow.setTopBrowserView(this.tabPageView);
      this.tabPageView.webContents.focus();
      this.tabPageView.webContents.send('focus-search');
    }

    this.activeTabId = id;

    // if old tab does not exist remove it
    if (typeof oldTabView !== 'undefined') {
      this.mainWindow.removeBrowserView(oldTabView.view);
    }

    // if no id, tell main window that it is inactive, and return
    // RETURNS
    if (id === -1) {
      this.mainWindow.webContents.send('set-active', false);
      this.tabPageView.webContents.send('set-active', true);
      this.resize();
      return;
    }

    // tell main window that it is active and get the tabview reference
    this.mainWindow.webContents.send('set-active', true);
    this.tabPageView.webContents.send('set-active', false);
    const tabView = this.allTabViews[id];
    if (typeof tabView === 'undefined') {
      throw new Error(`setTab: tab with id ${id} does not exist`);
    }

    // add title bar view to main window
    this.mainWindow.addBrowserView(this.titleBarView);
    this.mainWindow.setTopBrowserView(this.titleBarView);

    // add the live page to the main window and focus it a little bit later
    this.mainWindow.addBrowserView(tabView.view);
    setTimeout(() => {
      // mouse icons dont switch properly on macOS after closing and opening a BrowserView
      // unless we time this out for some reason :/
      tabView.view.webContents.focus();
    }, 100);
    this.activeTabId = id;
    this.titleBarView.webContents.send('tab-was-set', id);

    // load the url if it exists
    if (tabView.unloadedUrl !== '') {
      this.loadUrlInTab(id, tabView.unloadedUrl, false, tabView.scrollHeight);
      tabView.unloadedUrl = '';
    }

    // remove the tab page view if it still exists

    // close the text finder
    this.closeFind();

    // remove the url peek view if it exists
    if (windowHasView(this.mainWindow, this.urlPeekView)) {
      this.mainWindow.setTopBrowserView(this.urlPeekView);
    }
    // tell the tab page that just accessed some tab
    // this updates the access time
    this.tabPageView.webContents.send('access-tab', id);

    // set the padding
    const padding = this.browserPadding();
    this.mainWindow.webContents.send('set-padding', padding.toString());
    this.tabPageView.webContents.send('set-padding', padding.toString());

    this.resize();
    this.resizeTabView(tabView);
  }

  loadUrlInTab(
    id: number,
    url: string,
    dontActuallyLoadUrl = false,
    scrollHeight = 0
  ) {
    if (id === -1 || url === '') {
      return;
    }
    const tabView = this.allTabViews[id];
    if (typeof tabView === 'undefined') {
      throw new Error(
        `load-url-in-active-tab: tab with id ${id} does not exist`
      );
    }

    const fullUrl = stringToUrl(url);

    this.titleBarView.webContents.send('web-contents-update', [
      id,
      true,
      false,
      fullUrl,
    ]);

    (async () => {
      if (!dontActuallyLoadUrl) {
        await tabView.view.webContents.loadURL(fullUrl).catch(() => {
          // failed to load url
          // todo: handle this
          console.log(`error loading url: ${fullUrl}`);
        });
        tabView.view.webContents.send('scroll-to', scrollHeight);
      } else {
        tabView.unloadedUrl = fullUrl;
      }
      const newUrl = dontActuallyLoadUrl
        ? fullUrl
        : tabView.view.webContents.getURL();
      this.closeFind();
      this.titleBarView.webContents.send('url-changed', [id, newUrl]);
      this.tabPageView.webContents.send('url-changed', [id, newUrl]);
      updateWebContents(this.titleBarView, id, tabView);
    })();
  }

  tabBack(id: number) {
    if (!this.allTabViews[id]) {
      return;
    }
    if (this.allTabViews[id].view.webContents.canGoBack()) {
      this.closeFind();
      this.allTabViews[id].view.webContents.goBack();
    }
    updateWebContents(this.titleBarView, id, this.allTabViews[id]);
  }

  tabForward(id: number) {
    if (!this.allTabViews[id]) {
      return;
    }
    if (this.allTabViews[id].view.webContents.canGoForward()) {
      this.closeFind();
      this.allTabViews[id].view.webContents.goForward();
    }
    updateWebContents(this.titleBarView, id, this.allTabViews[id]);
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

    const mousePoint = screen.getCursorScreenPoint();
    WindowManager.display.activeDisplay = screen.getDisplayNearestPoint(
      mousePoint
    );

    const height80 =
      WindowManager.display.activeDisplay.workAreaSize.height * 0.7;
    const floatingWidth = Math.floor(height80 * 0.7);
    const floatingHeight = Math.floor(height80);
    this.windowSize.width = floatingWidth;
    this.windowSize.height = floatingHeight;
    this.updateMainWindowBounds();
    this.resize();

    const { x, y } = mousePoint;
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
      this.unFloat(WindowManager.display.activeDisplay);
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

  float() {
    if (this.windowFloating) {
      return;
    }

    this.windowFloating = true;

    const display = WindowManager.display.activeDisplay;
    const height80 = display.workAreaSize.height * 0.7;
    const floatingWidth = Math.floor(height80 * 0.7);
    const floatingHeight = Math.floor(height80);

    // snap to corner mode
    if (!windowHasView(this.mainWindow, this.overlayView)) {
      this.mainWindow?.addBrowserView(this.overlayView);
      this.mainWindow?.setTopBrowserView(this.overlayView);
    }
    if (windowHasView(this.mainWindow, this.titleBarView)) {
      this.mainWindow?.removeBrowserView(this.titleBarView);
    }
    this.windowPosition[0] =
      display.workAreaSize.width / 2.0 -
      floatingWidth / 2.0 +
      display.workArea.x;
    this.windowPosition[1] =
      display.workAreaSize.height / 2.0 -
      floatingHeight / 2.0 +
      display.workArea.y;
    this.windowSize.width = floatingWidth;
    this.windowSize.height = floatingHeight;
    this.windowVelocity[0] = 0;
    this.windowVelocity[1] = 0;
    this.updateMainWindowBounds();

    this.mainWindow.webContents.send('set-padding', '');

    // const padding = this.browserPadding();
    Object.values(this.allTabViews).forEach((tabView) => {
      tabView.windowFloating = this.windowFloating;
      // tabView.resize(padding);
      this.resizeTabView(tabView);
    });

    this.resize();
  }

  unFloat(display: Display) {
    this.windowPosition[0] = display.workArea.x;
    this.windowPosition[1] = display.workArea.y;
    this.windowSize.width = display.workArea.width;
    this.windowSize.height =
      display.workArea.height + (process.platform === 'darwin' ? 0 : 1); // todo: on windows if you make it the same size as monitor, everything breaks!?!??!?!?
    this.updateMainWindowBounds();
    this.resize();

    if (!this.windowFloating) {
      return;
    }

    this.windowFloating = false;

    if (windowHasView(this.mainWindow, this.overlayView)) {
      this.mainWindow?.removeBrowserView(this.overlayView);
    }

    if (!windowHasView(this.mainWindow, this.titleBarView)) {
      this.mainWindow?.addBrowserView(this.titleBarView);
      this.mainWindow?.setTopBrowserView(this.titleBarView);
    }

    const padding = this.browserPadding();
    this.mainWindow.webContents.send('set-padding', padding.toString());

    Object.values(this.allTabViews).forEach((tabView) => {
      tabView.windowFloating = this.windowFloating;
    });
    this.resize();
  }

  resize() {
    if (this.mainWindow === null || typeof this.mainWindow === 'undefined') {
      return;
    }

    const padding = this.windowFloating ? 10 : this.browserPadding();
    const hh = this.windowFloating ? 0 : headerHeight;
    const windowSize = this.mainWindow.getSize();

    const urlPeekWidth = 475;
    const urlPeekHeight = 20;

    const findViewWidth = 350;
    const findViewHeight = 50;
    const findViewMarginRight = 20;

    const titleBarBounds = {
      x: padding,
      y: padding,
      width: windowSize[0] - padding * 2,
      height: hh,
    };
    // console.log(titleBarBounds);
    this.titleBarView.setBounds(titleBarBounds);
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
      x: 0,
      y: 0,
      width: windowSize[0],
      height: windowSize[1],
    });

    // const windowSize = this.window.getSize();
    // const padding = this.windowFloating ? 10 : browserPadding;
    // const hh = this.windowFloating ? 0 : headerHeight;

    Object.values(this.allTabViews).forEach((tabView) => {
      this.resizeTabView(tabView);
    });
  }

  findActive() {
    return windowHasView(this.mainWindow, this.findView);
  }

  tabPageActive(): boolean {
    return this.activeTabId === -1;
  }

  toggle(mouseInBorder: boolean) {
    if (this.windowFloating) {
      this.hideMainWindow();
    } else if (this.tabPageActive()) {
      if (this.historyModalActive) {
        this.tabPageView.webContents.send('close-history-modal');
      } else {
        this.hideMainWindow();
      }
    } else if (windowHasView(this.mainWindow, this.titleBarView)) {
      const findIsActive = this.findActive();
      if (findIsActive && !mouseInBorder) {
        this.closeFind();
      } else {
        console.log('a');
        this.setTab(-1);
      }
    }
  }

  headerHeight() {
    return this.windowFloating ? 0 : headerHeight;
  }

  innerBounds(): Electron.Rectangle {
    const padding = this.windowFloating ? 10 : this.browserPadding();
    const windowSize = this.mainWindow.getSize();
    const hh = this.headerHeight();
    return {
      x: padding,
      y: hh + padding,
      width: windowSize[0] - padding * 2,
      height: Math.max(windowSize[1] - hh, 0) - padding * 2,
    };
  }

  resizeTabView(tabView: TabView) {
    tabView.resize(this.innerBounds());
  }

  hideMainWindow() {
    this.tabPageView.webContents.send('blur');
    this.mainWindow?.hide();
  }

  focusSearch() {
    if (this.webBrowserViewActive()) {
      this.titleBarView.webContents.focus();
      this.titleBarView.webContents.send('focus');
      // const tab = this.allTabViews[this.activeTabId];
      // tab.view.webContents.send('pew');
    }
  }
}
