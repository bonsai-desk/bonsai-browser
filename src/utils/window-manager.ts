/* eslint no-console: off */
import {
  app,
  BrowserView,
  BrowserWindow,
  Display,
  globalShortcut,
  HandlerDetails,
  ipcMain,
  IpcMainEvent,
  NativeImage,
  screen,
} from 'electron';
import BezierEasing from 'bezier-easing';
import fs from 'fs';
import Fuse from 'fuse.js';
import path from 'path';
import { Instance } from 'mobx-state-tree';
import { headerHeight } from './tab-view';
import {
  FIND_HTML,
  INDEX_HTML,
  OVERLAY_HTML,
  PRELOAD,
  TAB_PAGE,
  URL_PEEK_HTML,
} from '../constants';
import {
  parseMap,
  stringifyMap,
  stringToUrl,
  urlToMapKey,
  windowHasView,
} from './utils';
import calculateWindowTarget from './calculate-window-target';
import {
  currentWindowSize,
  handleFindText,
  innerBounds,
  makeView,
  pointInBounds,
  reloadTab,
  resizeAsFindView,
  resizeAsOverlayView,
  resizeAsPeekView,
  resizeAsTabPageView,
  resizeAsTitleBar,
  resizeAsWebView,
  saveTabs,
  updateContents,
  updateWebContents,
} from './wm-utils';
import {
  HistoryEntry,
  INavigateData,
  IWebView,
  OpenGraphInfo,
  TabInfo,
} from './interfaces';
import { HistoryData, INode } from '../store/history-store';

const glMatrix = require('gl-matrix');

const easeOut = BezierEasing(0, 0, 0.5, 1);

const DEBUG = true;

function log(str: string) {
  if (DEBUG) {
    console.log(str);
  }
}

function handleWillNavigate(
  view: IWebView,
  url: string,
  alertTargets: BrowserView[]
) {
  log(`${view.id} handle navigate to ${url}`);
  view.forwardUrl = undefined;
  view.forwardUrls = [];
  alertTargets.forEach((target) => {
    target.webContents.send('will-navigate', { id: view.id, url });
  });
}

function handleDidNavigate(
  view: IWebView,
  data: INavigateData,
  alertTargets: BrowserView[]
) {
  alertTargets.forEach((target) => {
    target.webContents.send('did-navigate', { id: view.id, ...data });
  });
}

function goBack(webView: IWebView, alertTargets: BrowserView[]) {
  webView.forwardUrl = webView.view.webContents.getURL();
  webView.forwardUrls.push(webView.view.webContents.getURL());
  webView.view.webContents.goBack();
  alertTargets.forEach((target) => {
    target.webContents.send('go-back', { id: webView.id });
  });
}

function handleGoForward(
  webView: IWebView,
  url: string,
  alertTargets: BrowserView[]
) {
  log(`${webView.id} request go forward to (${url}) [${webView.forwardUrls}]`);
  const forwardUrl = webView.forwardUrls[webView.forwardUrls.length - 1];
  if (forwardUrl === url) {
    webView.forwardUrls.pop();
    log(`${webView.id} match forward history match ${url}`);
    webView.view.webContents.goForward();
    alertTargets.forEach((target) => {
      target.webContents.send('go-forward', { id: webView.id, url });
    });
  } else {
    log(`${webView.id} could not go forward!`);
  }
}

export function addListeners(wm: WindowManager) {
  ipcMain.on('create-new-tab', () => {
    wm.createNewTab();
  });
  ipcMain.on('remove-tab', (_, id) => {
    wm.removeTabs([id]);
  });
  ipcMain.on('remove-tabs', (_, ids) => {
    wm.removeTabs(ids);
  });
  ipcMain.on('set-tab', (_, id) => {
    wm.setTab(id);
  });
  ipcMain.on('load-url-in-tab', (_, [id, url]) => {
    wm.loadUrlInTab(id, url);
  });
  ipcMain.on('tab-back', (_, id) => {
    wm.tabBack(id);
  });
  ipcMain.on('tab-forward', (_, id) => {
    wm.tabForward(id);
  });
  ipcMain.on('tab-refresh', (_, id) => {
    wm.tabRefresh(id);
  });
  ipcMain.on('close-find', () => {
    wm.closeFind();
  });
  ipcMain.on('find-text-change', (_, boxText) => {
    wm.findTextChange(boxText);
  });
  ipcMain.on('find-previous', () => {
    wm.findPrevious();
  });
  ipcMain.on('find-next', () => {
    wm.findNext();
  });
  ipcMain.on('windowMoving', (_, { mouseX, mouseY }) => {
    wm.handleWindowMoving(mouseX, mouseY);
  });
  ipcMain.on('windowMoved', () => {
    wm.handleWindowMoved();
  });
  ipcMain.on('wheel', (_, [deltaX, deltaY]) => {
    const activeTabView = wm.allWebViews[wm.activeTabId];
    if (activeTabView !== null) {
      activeTabView.view.webContents.executeJavaScript(`
        window.scrollBy(${deltaX}, ${deltaY});
      `);
    }
  });
  ipcMain.on('search-url', (_, url) => {
    wm.tabPageView.webContents.send('close-history-modal');
    const newTabId = wm.createNewTab();
    wm.loadUrlInTab(newTabId, url);
    wm.setTab(newTabId);
  });
  ipcMain.on('history-search', (_, query) => {
    if (query === '') {
      wm.tabPageView.webContents.send('history-search-result', null);
    } else {
      const result = wm.historyFuse.search(query, { limit: 50 });
      wm.tabPageView.webContents.send(
        'history-search-result',
        result.map((entry: { item: HistoryEntry }) => {
          return entry.item;
        })
      );
    }
  });
  ipcMain.on('history-modal-active-update', (_, historyModalActive) => {
    wm.historyModalActive = historyModalActive;
  });
  ipcMain.on('clear-history', () => {
    wm.clearHistory();
  });
  ipcMain.on('toggle-pin', () => {
    wm.setPinned(!wm.isPinned);
  });
  ipcMain.on('float', () => {
    wm.float();
  });
  ipcMain.on('toggle', () => {
    wm.toggle(true);
  });
  ipcMain.on('click-main', () => {
    if (wm.webBrowserViewActive()) {
      wm.unSetTab();
    }
  });
  ipcMain.on('open-workspace-url', (_, url) => {
    wm.tabPageView.webContents.send('close-history-modal');

    const baseUrl = url.split('#')[0];
    let tabExists = false;

    Object.values(wm.allWebViews).forEach((tabView) => {
      const tabUrl = tabView.view.webContents.getURL();
      const tabBaseUrl = tabUrl.split('#')[0];
      if (tabBaseUrl === baseUrl) {
        wm.setTab(tabView.id);
        tabExists = true;
      }
    });

    if (!tabExists) {
      const newTabId = wm.createNewTab();
      wm.loadUrlInTab(newTabId, url);
      wm.setTab(newTabId);
    }
  });
  ipcMain.on('request-snapshot-path', () => {
    const snapshotPath = path.join(
      app.getPath('userData'),
      'workspaceSnapshot.json'
    );
    wm.tabPageView.webContents.send('set-snapshot-path', snapshotPath);
  });
  ipcMain.on('open-graph-data', (_, data: OpenGraphInfo) => {
    const tabView = wm.allWebViews[wm.activeTabId];
    if (typeof tabView !== 'undefined') {
      if (tabView.historyEntry?.openGraphData.title === 'null') {
        tabView.historyEntry.openGraphData = data;
        wm.addHistoryEntry(tabView.historyEntry);
      }
    }
  });
  ipcMain.on('scroll-height', (_, [id, height]) => {
    const tabView = wm.allWebViews[id];
    if (typeof tabView !== 'undefined') {
      tabView.scrollHeight = height;
    }
  });
  ipcMain.on('go-back', (_, data) => {
    const { senderId } = data;
    log(`${senderId} request go back`);
    const webView = wm.allWebViews[senderId];
    if (webView) {
      if (webView.view.webContents.canGoBack()) {
        log(`${senderId} can go back`);
        goBack(webView, [wm.tabPageView]);
      } else {
        log(`${senderId} can NOT go back`);
      }
    } else {
      log(`Failed to find webView for ${senderId}`);
    }
  });
  ipcMain.on('go-forward', (_, eventData) => {
    const { senderId, forwardTo } = eventData;
    const { data: historyData }: INode = forwardTo;
    const { url }: Instance<typeof HistoryData> = historyData;
    const webView = wm.allWebViews[senderId];
    if (webView) {
      handleGoForward(webView, url, [wm.tabPageView]);
    }
  });
}

interface IAction {
  action: 'deny';
}

function genHandleWindowOpen(
  view: IWebView,
  callback: (url: string) => number,
  alertTargets: BrowserView[]
) {
  return (details: HandlerDetails): IAction => {
    const newWindowId = callback(details.url);
    alertTargets.forEach((target) => {
      target.webContents.send('new-window', {
        senderId: view.id,
        receiverId: newWindowId,
        details,
      });
    });
    return { action: 'deny' };
  };
}

export default class WindowManager {
  static dragThresholdSquared = 5 * 5;

  windowFloating = false;

  allWebViews: Record<number, IWebView> = {};

  activeTabId = -1;

  movingWindow = false;

  mainWindow: BrowserWindow;

  titleBarView: BrowserView;

  tabPageView: BrowserView;

  windowPosition = glMatrix.vec2.create();

  windowVelocity = glMatrix.vec2.create();

  historyFuse = new Fuse<HistoryEntry>([], {
    keys: ['url', 'title', 'openGraphData.title'],
  });

  historyModalActive = false;

  isPinned = false;

  lastX: number | null = null;

  lastY: number | null = null;

  lastTime = 0;

  targetWindowPosition = glMatrix.vec2.create();

  windowSize = { width: 0, height: 0 };

  display: Display;

  webBrowserViewActive(): boolean {
    return this.activeTabId !== -1;
  }

  browserPadding(): number {
    if (this.display !== null) {
      const ratio = this.webViewIsActive() ? 50 : 15;
      return Math.floor(this.display.workAreaSize.height / ratio);
    }
    return 35;
  }

  private readonly urlPeekView: BrowserView;

  private readonly findView: BrowserView;

  private readonly overlayView: BrowserView;

  private findText = '';

  private lastFindTextSearch = '';

  private historyMap = new Map<string, HistoryEntry>();

  private removedTabsStack: TabInfo[][] = [];

  private loadedOpenTabs = false;

  private startMouseX: number | null = null;

  private startMouseY: number | null = null;

  private validFloatingClick = false;

  private windowSpeeds: number[][] = [];

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;

    const displays = screen.getAllDisplays();
    if (displays.length === 0) {
      throw new Error('No displays!');
    }

    this.display = screen.getPrimaryDisplay();

    this.mainWindow.on('close', () => {
      this.saveHistory();
    });

    this.mainWindow.on('resize', this.handleResize);
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
      Object.values(this.allWebViews).forEach((tabView) => {
        this.removeTab(tabView.id);
      });
      this.loadHistory();
    });

    screen.on('display-metrics-changed', (_, changedDisplay) => {
      if (changedDisplay.id === this.display.id) {
        if (this.windowFloating) {
          const height80 = this.display.workAreaSize.height * 0.7;
          const floatingWidth = Math.floor(height80 * 0.7);
          const floatingHeight = Math.floor(height80);
          this.windowSize.width = floatingWidth;
          this.windowSize.height = floatingHeight;
          this.updateMainWindowBounds();
        }
        if (!this.windowFloating) {
          this.unFloat();
        }
        this.handleResize();

        const target = calculateWindowTarget(
          1,
          0,
          0,
          0,
          0,
          0,
          this.windowSize,
          this.windowPosition,
          this.display
        );
        if (target[0]) {
          // eslint-disable-next-line prefer-destructuring
          this.targetWindowPosition[0] = target[2][0];
          // eslint-disable-next-line prefer-destructuring
          this.targetWindowPosition[1] = target[2][1];
        }
      }
    });

    this.handleResize();

    setInterval(() => {
      if (this.loadedOpenTabs) {
        saveTabs(this.allWebViews);
      }
    }, 1000 * 5);

    setInterval(() => {
      this.saveHistory();
    }, 1000 * 60);

    let escapeActive = false;
    setInterval(() => {
      if (mainWindow.isDestroyed()) {
        return;
      }
      const mainWindowVisible = mainWindow.isVisible();
      const webBrowserViewIsActive = this.webBrowserViewActive;
      const mouseIsInBorder = !this.mouseInInner;
      const findIsActive = windowHasView(this.mainWindow, this.findView);
      if (
        !escapeActive &&
        mainWindowVisible &&
        webBrowserViewIsActive &&
        (mouseIsInBorder || findIsActive)
      ) {
        escapeActive = true;
        globalShortcut.register('Escape', () => {
          this.toggle(!this.mouseInInner);
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

    addListeners(this);

    mainWindow.webContents.on('did-finish-load', () => {
      const mousePoint = screen.getCursorScreenPoint();
      this.display = screen.getDisplayNearestPoint(mousePoint);
      this.mainWindow.webContents.send(
        'set-padding',
        this.browserPadding.toString()
      );
      // mainWindow?.show();
      // wm.unFloat(display.activeDisplay);
      // setTimeout(() => {
      //   wm.unSetTab();
      // }, 10);
    });

    // todo this breaks macOS dock
    mainWindow.on('blur', () => {
      if (
        !this.windowFloating &&
        this.mainWindow.isVisible() &&
        !this.isPinned
      ) {
        // wm.unFloat(display.activeDisplay);
        // wm.mainWindow?.hide();
        // wm.hideWindow();
        // }
      }
    });

    mainWindow.on('minimize', (e: Event) => {
      if (mainWindow !== null) {
        e.preventDefault();
        this.hideWindow();
      }
    });

    this.hideWindow();
    this.handleResize();
  }

  createTabView(
    window: BrowserWindow,
    titleBarView: BrowserView,
    urlPeekView: BrowserView,
    findView: BrowserView
  ): IWebView {
    if (!window) {
      throw new Error('"window" is not defined');
    }

    const webView: IWebView = {
      id: -1,
      window,
      view: new BrowserView({
        webPreferences: {
          nodeIntegration: false,
          sandbox: true,
          preload: PRELOAD,
          contextIsolation: true, // todo: do we need this? security concern?
        },
      }),
      historyEntry: null,
      title: '',
      favicon: '',
      windowFloating: false,
      unloadedUrl: '',
      imgString: '',
      scrollHeight: 0,
      forwardUrl: undefined,
      forwardUrls: [],
    };

    webView.view.setBackgroundColor('#FFFFFF');
    webView.id = webView.view.webContents.id;

    const callback = (url: string): number => {
      const newTabId = this.createNewTab();
      this.loadUrlInTab(newTabId, url);
      return newTabId;
    };
    const handleWindowOpen = genHandleWindowOpen(webView, callback, [
      this.tabPageView,
    ]);
    webView.view.webContents.setWindowOpenHandler(handleWindowOpen);
    webView.view.webContents.on('page-title-updated', (_, title) => {
      if (webView.historyEntry?.title === '') {
        webView.historyEntry.title = title;
        this.addHistoryEntry(webView.historyEntry);
      }
      webView.title = title;
      titleBarView.webContents.send('title-updated', [webView.id, title]);
      this.tabPageView.webContents.send('title-updated', [webView.id, title]);
    });
    webView.view.webContents.on('will-navigate', (_, url) => {
      handleWillNavigate(webView, url, [this.tabPageView]);
    });
    webView.view.webContents.on(
      'did-navigate',
      (event, url, httpResponseCode, httpStatusText) => {
        if (windowHasView(window, findView)) {
          window.removeBrowserView(findView);
        }
        const { sender } = event as IpcMainEvent;
        log(`${sender.id} did navigate to ${sender.getURL()}`);
        updateContents(webView, this.titleBarView, this.tabPageView);
        handleDidNavigate(webView, { url, httpResponseCode, httpStatusText }, [
          this.tabPageView,
        ]);
      }
    );
    // todo incorporate these for SPA navigation events
    webView.view.webContents.on('did-frame-navigate', () => {
      updateContents(webView, this.titleBarView, this.tabPageView);
    });
    webView.view.webContents.on('did-navigate-in-page', (_, url) => {
      log(`${webView.id} did navigate IN PAGE to ${url}`);
      updateContents(webView, this.titleBarView, this.tabPageView);
      handleWillNavigate(webView, url, [this.tabPageView]);
    });
    webView.view.webContents.on('page-favicon-updated', (_, favicons) => {
      if (favicons.length > 0) {
        if (webView.historyEntry?.favicon === '') {
          // eslint-disable-next-line prefer-destructuring
          webView.historyEntry.favicon = favicons[0];
          this.addHistoryEntry(webView.historyEntry);
        }
        // eslint-disable-next-line prefer-destructuring
        webView.favicon = favicons[0];
        titleBarView.webContents.send('favicon-updated', [
          webView.id,
          favicons[0],
        ]);
        this.tabPageView.webContents.send('favicon-updated', [
          webView.id,
          favicons[0],
        ]);
      }
    });
    webView.view.webContents.on('update-target-url', (_, url) => {
      if (url === '') {
        if (windowHasView(window, urlPeekView)) {
          window.removeBrowserView(urlPeekView);
        }
      }
      if (url !== '') {
        if (!windowHasView(window, urlPeekView)) {
          window.addBrowserView(urlPeekView);
          window.setTopBrowserView(urlPeekView);
          this.handleResize();
        }
        urlPeekView.webContents.send('peek-url-updated', url);
      }
    });
    webView.view.webContents.on('found-in-page', (_, result) => {
      findView.webContents.send('find-results', [
        result.activeMatchOrdinal,
        result.matches,
      ]);
    });
    webView.view.webContents.on('will-redirect', (_, url, isInPlace) => {
      console.log('will redirect');
      console.log(url, isInPlace);
    });
    webView.view.webContents.on(
      'did-redirect-navigation',
      (_, url, isInPlace) => {
        console.log('did redirect');
        console.log(url, isInPlace);
      }
    );

    return webView;
  }

  // window

  hideWindow() {
    let opacity = 1.0;
    // const display = { activeDisplay: screen.getPrimaryDisplay() };
    this.mainWindow.setOpacity(opacity);
    const handle = setInterval(() => {
      opacity -= 0.1;
      if (opacity < 0.0) {
        opacity = 0.0;
        clearInterval(handle);
        this.unFloat();
        this.tabPageView.webContents.send('blur');
        this.mainWindow?.hide();
        if (
          process.platform === 'darwin' &&
          process.env.NODE_ENV !== 'development'
        ) {
          app.hide();
        }
      }
      this.mainWindow.setOpacity(easeOut(opacity));
    }, 10);
  }

  showWindow() {
    const mousePoint = screen.getCursorScreenPoint();
    const display = { activeDisplay: screen.getPrimaryDisplay() };
    display.activeDisplay = screen.getDisplayNearestPoint(mousePoint);

    this.mainWindow.setVisibleOnAllWorkspaces(true, {
      visibleOnFullScreen: true,
    });
    this.mainWindow.show();
    if (process.platform === 'darwin') {
      app.dock.show();
    }
    this.mainWindow.setVisibleOnAllWorkspaces(false, {
      visibleOnFullScreen: true,
    });
    this.mainWindow.setOpacity(1.0);
    this.setPinned(false);
    this.unFloat();
    if (this.webViewIsActive()) {
      // todo: search box does not get highlighted on macos unless we do this hack
      setTimeout(() => {
        this.unSetTab();
      }, 10);
    }

    // todo: setting the opacity to zero here
    // makes the vibrancy colors bad so we just don't
    // fade in until a workaround is found

    // let opacity = 0.0;
    // this.mainWindow.setOpacity(opacity);
    // const handle = setInterval(() => {
    //   opacity += 0.1;
    //   if (opacity > 1.0) {
    //     opacity = 1.0;
    //     clearInterval(handle);
    //   }
    //   this.mainWindow.setOpacity(easeOut(opacity));
    // }, 10);
  }

  setPinned(pinned: boolean) {
    this.isPinned = pinned;
    this.mainWindow.webContents.send('set-pinned', pinned);
    this.tabPageView.webContents.send('set-pinned', pinned);
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

  closeFind() {
    if (windowHasView(this.mainWindow, this.findView)) {
      this.mainWindow.removeBrowserView(this.findView);
      const tabView = this.allWebViews[this.activeTabId];
      if (typeof tabView !== 'undefined') {
        tabView.view.webContents.stopFindInPage('clearSelection');
        this.lastFindTextSearch = '';
      }
    }
  }

  resizeWebViews() {
    const padding = this.padding();
    const bounds = innerBounds(this.mainWindow, padding);
    Object.values(this.allWebViews).forEach((tabView) => {
      this.resizeWebView(tabView, bounds);
    });
  }

  resizeWebView(tabView: IWebView, bounds: Electron.Rectangle) {
    resizeAsWebView(
      tabView,
      this.tabPageView,
      bounds,
      this.headerHeight(),
      currentWindowSize(this.mainWindow)
    );
  }

  // tabs

  createNewTab(): number {
    const newTabView = this.createTabView(
      this.mainWindow,
      this.titleBarView,
      this.urlPeekView,
      this.findView
    );
    const { id } = newTabView;
    this.allWebViews[id] = newTabView;
    this.titleBarView.webContents.send('tabView-created-with-id', id);
    this.tabPageView.webContents.send('tabView-created-with-id', id);
    return id;
  }

  removeTabs(ids: number[]) {
    if (ids.length === 0) {
      return;
    }

    const tabs = ids.map((id) => {
      const tabView = this.allWebViews[id];
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

  unSetTab(shouldScreenshot = true) {
    const oldTabView = this.allWebViews[this.activeTabId];

    // move title bar off screen
    const hh = this.headerHeight();
    const padding = this.padding();
    const windowSize = currentWindowSize(this.mainWindow);
    const titleBarBounds = {
      x: 0,
      y: windowSize[1] + 1,
      width: windowSize[0] - padding * 2,
      height: hh,
    };
    this.titleBarView.setBounds(titleBarBounds);

    // move webview off screen (to be removed after screenshot)
    if (typeof oldTabView !== 'undefined') {
      const webViewBounds = {
        x: 0,
        y: windowSize[1] + 1,
        width: windowSize[0] - padding * 2,
        height: Math.max(windowSize[1] - hh, 0) - padding * 2,
      };
      oldTabView.view.setBounds(webViewBounds);
    }

    // remove webview callback
    const cleanupBrowser = () => {
      // if old tab exists, remove it
      if (typeof oldTabView !== 'undefined') {
        this.mainWindow.removeBrowserView(oldTabView.view);
      }
    };

    // return to main tab page
    this.mainWindow.setTopBrowserView(this.tabPageView);
    this.tabPageView.webContents.focus();
    this.tabPageView.webContents.send('focus-search');

    if (windowHasView(this.mainWindow, this.findView)) {
      this.closeFind();
    }

    // screenshot page if needed
    if (shouldScreenshot && typeof oldTabView !== 'undefined') {
      const cachedId = this.activeTabId;
      this.screenShotTab(cachedId, oldTabView, cleanupBrowser);
    } else {
      cleanupBrowser();
    }

    this.activeTabId = -1;

    // tell tab page that it is active
    this.tabPageView.webContents.send('set-active', true);
    // this.resize();
  }

  setTab(id: number) {
    if (id === -1) {
      throw new Error('Use unSetTab instead of setTab(-1)!');
    }
    const oldTabView = this.allWebViews[this.activeTabId];

    this.activeTabId = id;

    // if old tab does not exist remove it
    if (typeof oldTabView !== 'undefined') {
      this.mainWindow.removeBrowserView(oldTabView.view);
    }

    // tell main window that it is active and get the tabview reference
    this.mainWindow.webContents.send('set-active', true);
    this.tabPageView.webContents.send('set-active', false);
    const tabView = this.allWebViews[id];
    if (typeof tabView === 'undefined') {
      throw new Error(`setTab: tab with id ${id} does not exist`);
    }

    const hh = this.headerHeight();
    const windowSize = currentWindowSize(this.mainWindow);
    const padding = this.padding();
    const bounds = innerBounds(this.mainWindow, padding);

    // add title bar view to main window
    if (!windowHasView(this.mainWindow, this.titleBarView)) {
      this.mainWindow.addBrowserView(this.titleBarView);
    }
    resizeAsTitleBar(this.titleBarView, hh, bounds);
    this.mainWindow.setTopBrowserView(this.titleBarView);

    // this.resizeWebView(tabView, bounds);

    // add the live page to the main window and focus it a little bit later
    this.mainWindow.addBrowserView(tabView.view);
    setTimeout(() => {
      // mouse icons dont switch properly on macOS after closing and opening a BrowserView
      // unless we time this out for some reason :/
      tabView.view.webContents.focus();
    }, 100);
    this.activeTabId = id;
    this.titleBarView.webContents.send('tab-was-set', id);
    this.tabPageView.webContents.send('tab-was-set', id);

    // load the url if it exists
    if (tabView.unloadedUrl !== '') {
      this.loadUrlInTab(id, tabView.unloadedUrl, false, tabView.scrollHeight);
      tabView.unloadedUrl = '';
    }

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
    this.tabPageView.webContents.send('set-padding', padding.toString());

    // this.resize();

    resizeAsPeekView(this.urlPeekView, bounds);
    resizeAsFindView(this.findView, hh, bounds);
    resizeAsOverlayView(this.overlayView, windowSize);
    this.resizeWebViews();
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
    const tabView = this.allWebViews[id];
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
      updateWebContents(this.titleBarView, id, tabView.view);
    })();
  }

  tabBack(id: number) {
    if (!this.allWebViews[id]) {
      return;
    }
    if (this.allWebViews[id].view.webContents.canGoBack()) {
      this.closeFind();
      goBack(this.allWebViews[id], [this.tabPageView]);
    }
    updateWebContents(this.titleBarView, id, this.allWebViews[id].view);
  }

  tabForward(id: number) {
    if (!this.allWebViews[id]) {
      return;
    }
    if (this.allWebViews[id].view.webContents.canGoForward()) {
      this.closeFind();
      this.allWebViews[id].view.webContents.goForward();
    }
    updateWebContents(this.titleBarView, id, this.allWebViews[id].view);
  }

  tabRefresh(id: number) {
    this.closeFind();
    reloadTab(this.allWebViews, id);
  }

  // history

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
      if (this.loadedOpenTabs) {
        saveTabs(this.allWebViews);
      }
    } catch {
      // console.log('saveHistory error');
      // console.log(e);
    }
  }

  findTextChange(boxText: string) {
    this.findText = boxText;
    const tabView = this.allWebViews[this.activeTabId];
    if (typeof tabView !== 'undefined') {
      this.lastFindTextSearch = handleFindText(
        tabView.view,
        this.findText,
        this.lastFindTextSearch
      );
    }
  }

  findPrevious() {
    const tabView = this.allWebViews[this.activeTabId];
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
    const tabView = this.allWebViews[this.activeTabId];
    if (typeof tabView !== 'undefined') {
      this.lastFindTextSearch = handleFindText(
        tabView.view,
        this.findText,
        this.lastFindTextSearch
      );
    }
  }

  handleWindowMoving(mouseX: number, mouseY: number) {
    this.movingWindow = true;

    const mousePoint = screen.getCursorScreenPoint();
    this.display = screen.getDisplayNearestPoint(mousePoint);

    const height80 = this.display.workAreaSize.height * 0.7;
    const floatingWidth = Math.floor(height80 * 0.7);
    const floatingHeight = Math.floor(height80);
    this.windowSize.width = floatingWidth;
    this.windowSize.height = floatingHeight;
    this.updateMainWindowBounds();
    this.handleResize();

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

  handleWindowMoved() {
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
        this.windowPosition,
        this.display
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
      this.unFloat();
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
      this.handleResize();
    }

    const tabView = this.allWebViews[this.activeTabId];
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

    const { display } = this;
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

    const bounds = innerBounds(this.mainWindow, this.padding());
    Object.values(this.allWebViews).forEach((tabView) => {
      tabView.windowFloating = this.windowFloating;
      // tabView.resize(padding);
      this.resizeWebView(tabView, bounds);
    });

    this.handleResize();
  }

  handleResize() {
    if (this.mainWindow === null || typeof this.mainWindow === 'undefined') {
      return;
    }

    const hh = this.headerHeight();
    const windowSize = currentWindowSize(this.mainWindow);
    const padding = this.padding();
    const bounds = innerBounds(this.mainWindow, padding);

    resizeAsTitleBar(this.titleBarView, hh, bounds);
    resizeAsPeekView(this.urlPeekView, bounds);
    resizeAsFindView(this.findView, hh, bounds);
    resizeAsOverlayView(this.overlayView, windowSize);
    resizeAsTabPageView(this.tabPageView, windowSize);
    this.resizeWebViews();
  }

  toggle(mouseInBorder: boolean) {
    if (this.windowFloating) {
      this.hideWindow();
      // this.hideMainWindow();
    } else if (this.webViewIsActive()) {
      if (this.historyModalActive) {
        this.tabPageView.webContents.send('close-history-modal');
      } else {
        this.hideWindow();
        // this.hideMainWindow();
      }
    } else if (windowHasView(this.mainWindow, this.titleBarView)) {
      const findIsActive = windowHasView(this.mainWindow, this.findView);
      if (findIsActive && !mouseInBorder) {
        this.closeFind();
      } else {
        this.unSetTab();
      }
    }
  }

  focusSearch() {
    if (this.webBrowserViewActive()) {
      this.titleBarView.webContents.focus();
      this.titleBarView.webContents.send('focus');
    }
  }

  private screenShotTab(
    tabId: number,
    tabView: IWebView,
    callback?: () => void
  ) {
    tabView.view.webContents.send('get-scroll-height', tabId);
    const handleImage = (image: NativeImage) => {
      const jpgBuf = image.toJPEG(50);
      const imgString = `data:image/jpg;base64, ${jpgBuf.toString('base64')}`;
      tabView.imgString = imgString;
      this.tabPageView.webContents.send('tab-image-native', [tabId, imgString]);
      if (callback) {
        callback();
      }
      return null;
    };
    const handleError = (e: unknown) => {
      console.log(e);
      if (callback) {
        callback();
      }
    };
    tabView.view.webContents.capturePage().then(handleImage).catch(handleError);
  }

  private get mouseInInner() {
    const bounds = innerBounds(this.mainWindow, this.padding());
    return pointInBounds(screen.getCursorScreenPoint(), bounds);
  }

  private removeTab(id: number) {
    const tabView = this.allWebViews[id];
    if (typeof tabView === 'undefined') {
      throw new Error(`remove-tab: tab with id ${id} does not exist`);
    }
    this.mainWindow.removeBrowserView(tabView.view);
    if (id === this.activeTabId) {
      this.unSetTab();
    }
    this.closeFind();
    this.mainWindow.removeBrowserView(this.urlPeekView);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (tabView.view.webContents as any).destroy();
    delete this.allWebViews[id];
    this.titleBarView.webContents.send('tab-removed', id);
    this.tabPageView.webContents.send('tab-removed', id);
  }

  private loadTabFromTabInfo(tab: TabInfo) {
    const { url, title, favicon, imgString, scrollHeight }: TabInfo = tab;
    const newTabId = this.createNewTab();
    const tabView = this.allWebViews[newTabId];
    tabView.title = title;
    this.tabPageView.webContents.send('title-updated', [newTabId, title]);
    tabView.favicon = favicon;
    this.tabPageView.webContents.send('favicon-updated', [newTabId, favicon]);

    tabView.imgString = imgString;
    this.tabPageView.webContents.send('tab-image-native', [
      newTabId,
      tabView.imgString,
    ]);
    tabView.scrollHeight = scrollHeight;
    this.loadUrlInTab(newTabId, url, true);
  }

  private loadHistory() {
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

  private loadTabs() {
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

  private unFloat() {
    const { display } = this;

    this.windowPosition[0] = display.bounds.x;
    this.windowPosition[1] = display.bounds.y;
    this.windowSize.width = display.workArea.width;
    this.windowSize.height =
      display.bounds.height + (process.platform === 'darwin' ? 0 : 1); // todo: on windows if you make it the same size as monitor, everything breaks!?!??!?!?
    this.updateMainWindowBounds();

    const hh = this.headerHeight();
    const windowSize = currentWindowSize(this.mainWindow);
    const padding = this.padding();

    if (this.webViewIsActive()) {
      resizeAsTabPageView(this.tabPageView, windowSize);
    } else {
      const bounds = innerBounds(this.mainWindow, padding);

      resizeAsTitleBar(this.titleBarView, hh, bounds);
      resizeAsPeekView(this.urlPeekView, bounds);
      resizeAsFindView(this.findView, hh, bounds);
      resizeAsOverlayView(this.overlayView, windowSize);
      this.resizeWebViews();
    }

    if (!this.windowFloating) {
      return;
    }

    this.windowFloating = false;

    if (windowHasView(this.mainWindow, this.overlayView)) {
      this.mainWindow?.removeBrowserView(this.overlayView);
    }

    if (!windowHasView(this.mainWindow, this.titleBarView)) {
      this.mainWindow.addBrowserView(this.titleBarView);
    }

    this.mainWindow.webContents.send('set-padding', padding.toString());

    Object.values(this.allWebViews).forEach((tabView) => {
      tabView.windowFloating = this.windowFloating;
    });
    this.handleResize();
  }

  private padding(): number {
    return this.windowFloating ? 10 : this.browserPadding();
  }

  private webViewIsActive(): boolean {
    return this.activeTabId === -1;
  }

  private headerHeight(): number {
    return this.windowFloating ? 0 : headerHeight;
  }
}
