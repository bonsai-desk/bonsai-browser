/* eslint no-console: off */
/* eslint prefer-destructuring: off */
import {
  app,
  BrowserView,
  BrowserWindow,
  Display,
  globalShortcut,
  ipcMain,
  IpcMainEvent,
  NativeImage,
  screen,
} from 'electron';
import BezierEasing from 'bezier-easing';
import fs from 'fs';
import Fuse from 'fuse.js';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  FIND_HTML,
  floatingWindowEdgeMargin,
  headerHeight,
  PRELOAD,
  TAB_PAGE,
  tagSideBarWidth,
  URL_PEEK_HTML,
} from '../constants';
import {
  base64ImgToDisk,
  baseUrl,
  get16Favicon,
  stringifyMap,
  stringToUrl,
  tryDecrypt,
  urlToMapKey,
  windowHasView,
} from './utils';
import {
  currentWindowSize,
  genHandleWindowOpen,
  goBack,
  handleDidNavigate,
  handleFindText,
  handleGoForward,
  handleInPageNavigateWithoutGesture,
  handleWillNavigate,
  log,
  makeOnboardingWindow,
  makeView,
  pointInBounds,
  reloadTab,
  resizeFindView,
  resizePeekView,
  saveTabs,
  showOnboardingWindow,
  translateKeys,
  tryParseJSON,
  tryParseMap,
  updateContents,
  updateWebContents,
} from './wm-utils';
import { HistoryEntry, IWebView, OpenGraphInfo, TabInfo } from './interfaces';
import MixpanelManager from './mixpanel-manager';
import SaveData from './SaveData';
import { INode } from '../store/history-store';

interface LoadTextOptions {
  dontActuallyLoadUrl?: boolean;
  scrollHeight?: number;
  handleLoaded?: () => void;
  searchPattern?: string;
}

export default class WindowManager {
  // region variables
  windowFloating = false;

  floatingDirection = '';

  allWebViews: Record<number, IWebView> = {};

  activeTabId = -1;

  mainWindow: BrowserWindow;

  mixpanelManager: MixpanelManager;

  tabPageView: BrowserView;

  historyFuse = new Fuse<HistoryEntry>([], {
    keys: ['url', 'title', 'openGraphData.title'],
  });

  historyModalActive = false;

  display: Display;

  saveData: SaveData;

  onboardingWindow: BrowserWindow | null;

  onboardingWindowReady = false;

  mainWindowReady = false;

  easeOut = BezierEasing(0, 0, 0.5, 1);

  private readonly urlPeekView: BrowserView;

  private readonly findView: BrowserView;

  // private readonly overlayView: BrowserView;

  private findText = '';

  private lastFindTextSearch = '';

  private historyMap = new Map<string, HistoryEntry>();

  private removedTabsStack: TabInfo[][] = [];

  private loadedOpenTabs = false;
  // endregion

  constructor(mainWindow: BrowserWindow, mixpanelManager: MixpanelManager) {
    this.saveData = new SaveData();
    this.mainWindow = mainWindow;
    this.mixpanelManager = mixpanelManager;
    this.onboardingWindow = this.saveData.data.session
      ? null
      : this.initOnboardingWindow();

    const displays = screen.getAllDisplays();
    if (displays.length === 0) {
      throw new Error('No displays!');
    }

    this.mainWindow.on('close', () => {
      this.saveHistory();
    });

    this.mainWindow.on('resize', () => {
      this.handleResize();
    });

    this.urlPeekView = makeView(URL_PEEK_HTML);
    // this.urlPeekView.webContents.openDevTools({ mode: 'detach' });

    this.findView = makeView(FIND_HTML);
    // this.findView.webContents.openDevTools({ mode: 'detach' });

    // this.overlayView = makeView(OVERLAY_HTML);
    // this.overlayView.webContents.openDevTools({ mode: 'detach' });

    this.tabPageView = makeView(TAB_PAGE);
    this.tabPageView.webContents.openDevTools({ mode: 'detach' });

    this.mainWindow.setBrowserView(this.tabPageView);
    this.tabPageView.webContents.on('did-finish-load', () => {
      // we do this so hot reloading does not duplicate tabs
      Object.values(this.allWebViews).forEach((tabView) => {
        this.removeTab(tabView.id, false);
      });
      this.loadHistory();

      this.tabPageView.webContents.send(
        'set-seenEmailForm',
        this.saveData.data.seenEmailForm
      );
      if (this.saveData.data.tabView) {
        this.tabPageView.webContents.send(
          'set-tabview',
          this.saveData.data.tabView
        );
      }

      this.setDisplay(this.display);
    });

    const display = screen.getPrimaryDisplay();
    this.display = display; // linter doesn't know the function below sets the value
    this.setDisplay(display);

    screen.on('display-metrics-changed', (_, changedDisplay) => {
      if (changedDisplay.id === this.display.id) {
        this.setDisplay(changedDisplay);
        if (!this.windowFloating) {
          this.unFloat();
        }
        this.resizeBrowserWindow();
        this.handleResize();
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
      const webBrowserViewIsActive = this.webBrowserViewActive();
      const mouseIsInBorder = !this.mouseInInner();
      const findIsActive = windowHasView(this.mainWindow, this.findView);
      const mouseInWindow = pointInBounds(
        screen.getCursorScreenPoint(),
        this.mainWindow.getBounds()
      );
      if (
        !escapeActive &&
        mainWindowVisible &&
        webBrowserViewIsActive &&
        mouseInWindow &&
        (mouseIsInBorder || findIsActive)
      ) {
        escapeActive = true;
        globalShortcut.register('Escape', () => {
          if (this.mouseInInner()) {
            this.mixpanelManager.track('escape while mouse in inner');
          } else {
            this.mixpanelManager.track('escape while mouse not in inner');
          }
          this.toggle(!this.mouseInInner());
        });
      } else if (
        (escapeActive &&
          !findIsActive &&
          (!mainWindowVisible ||
            (mainWindowVisible && webBrowserViewIsActive && !mouseIsInBorder) ||
            (mainWindowVisible && !webBrowserViewIsActive))) ||
        (escapeActive && !mouseInWindow)
      ) {
        setTimeout(() => {
          // timeout here because there was sometimes a gap between this being
          // un-registered and the tab page taking over the escape key functionality
          escapeActive = false;
          globalShortcut.unregister('Escape');
        }, 10);
      }
    }, 10);

    this.addListeners();

    mainWindow.webContents.on('did-finish-load', () => {
      const mousePoint = screen.getCursorScreenPoint();
      this.setDisplay(screen.getDisplayNearestPoint(mousePoint));
    });

    mainWindow.on('minimize', (e: Event) => {
      if (mainWindow !== null && process.platform === 'darwin') {
        e.preventDefault();
        this.hideWindow();
      }
    });

    mainWindow.on('restore', () => {
      if (mainWindow !== null && process.platform !== 'darwin') {
        this.showWindow();
      }
    });

    this.hideWindow();
    this.handleResize();
    this.bindToggleShortcut('Alt+Space');

    this.initBoot();
  }

  createTabView(
    window: BrowserWindow,
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
          scrollBounce: process.platform === 'darwin',
          nodeIntegration: false,
          devTools: !app.isPackaged,
          contextIsolation: true,
          sandbox: true,
          preload: PRELOAD,
        },
      }),
      historyEntry: null,
      title: '',
      favicon: '',
      unloadedUrl: '',
      imgString: '',
      scrollHeight: 0,
      forwardUrl: undefined,
      forwardUrls: [],
      gestureAfterDOMLoad: false,
    };
    webView.view.webContents.session.setPermissionRequestHandler(
      (_a, _b, callback) => {
        callback(false); // todo: popup to request permissions
      }
    );
    // webView.view.webContents.session.webRequest.onHeadersReceived(
    //   (details, callback) => {
    //     callback({
    //       responseHeaders: {
    //         ...details.responseHeaders,
    //         'Content-Security-Policy': 'self',
    //       },
    //     });
    //   }
    // );

    // webView.view.webContents.openDevTools({ mode: 'detach' });

    webView.view.setBackgroundColor('#ffffff');
    webView.id = webView.view.webContents.id;

    const handleWindowOpen = genHandleWindowOpen(webView, [this.tabPageView]);
    webView.view.webContents.setWindowOpenHandler(handleWindowOpen);
    webView.view.webContents.on('page-title-updated', (_, title) => {
      if (webView.historyEntry?.title === '') {
        webView.historyEntry.title = title;
        this.addHistoryEntry(webView.historyEntry);
      }
      webView.title = title;
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
        log(`${sender.id} did-navigate to ${sender.getURL()}`);
        updateContents(webView, this.tabPageView);
        handleDidNavigate(webView, { url, httpResponseCode, httpStatusText }, [
          this.tabPageView,
        ]);
      }
    );
    // todo incorporate these for SPA navigation events
    webView.view.webContents.on('did-frame-navigate', () => {
      updateContents(webView, this.tabPageView);
    });
    webView.view.webContents.on(
      'did-navigate-in-page',
      (_, url, isMainFrame) => {
        if (isMainFrame) {
          log(`${webView.id} did-navigate-in-page main-frame to ${url}`);
          updateContents(webView, this.tabPageView);
          if (webView.gestureAfterDOMLoad) {
            this.closeFind();
            handleWillNavigate(webView, url, [this.tabPageView]);
          } else {
            handleInPageNavigateWithoutGesture(webView, url, [
              this.tabPageView,
            ]);
          }
        } else {
          log(`${webView.id} did-navigate-in-page sub-frame`);
        }
      }
    );
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
    webView.view.webContents.on(
      'did-start-navigation',
      (_, url, isInPlace, isMainFrame) => {
        if (isMainFrame) {
          log(
            `\n${webView.id} did-start-navigation (in-place ${isInPlace}) to ${url}`
          );
        }
      }
    );
    webView.view.webContents.on(
      'will-redirect',
      (event, url, isInPlace, isMainFrame) => {
        if (isMainFrame) {
          log(`${webView.id} will-redirect (in-place ${isInPlace}) to ${url}`);
          event.preventDefault();
          webView.view.webContents.loadURL(url);
        }
      }
    );
    webView.view.webContents.on(
      'did-redirect-navigation',
      (_, url, isInPlace) => {
        console.log('did redirect');
        console.log(url, isInPlace);
      }
    );
    webView.view.webContents.on('page-favicon-updated', (_, favicons) => {
      if (favicons.length > 0) {
        if (webView.historyEntry?.favicon === '') {
          // eslint-disable-next-line prefer-destructuring
          webView.historyEntry.favicon = favicons[0];
          this.addHistoryEntry(webView.historyEntry);
        }
        // eslint-disable-next-line prefer-destructuring
        webView.favicon = favicons[0];
        this.tabPageView.webContents.send('favicon-updated', [
          webView.id,
          get16Favicon(favicons),
        ]);
      }
    });

    return webView;
  }

  // window

  hideWindow() {
    this.setWindowFloating(false);
    // this.overlayView.webContents.send('cancel-animation-frame');

    let opacity = 1.0;
    // const display = { activeDisplay: screen.getPrimaryDisplay() };
    this.mainWindow.setOpacity(opacity);
    const handle = setInterval(() => {
      opacity -= 0.1;
      if (opacity < 0.0) {
        opacity = 0.0;
        clearInterval(handle);
        this.hideWindowNoAnimation();
      }
      this.mainWindow.setOpacity(this.easeOut(opacity));
    }, 10);
  }

  hideWindowNoAnimation() {
    this.tabPageView.webContents.send('blur');
    if (process.platform === 'darwin' || process.platform === 'linux') {
      this.mainWindow?.hide();
    } else {
      this.mainWindow.minimize();
    }
    if (
      process.platform === 'darwin' &&
      process.env.NODE_ENV !== 'development'
    ) {
      // dont hide the app in development otherwise the devtool windows dissapear
      // we want to hide in production so the previous window gets focus when bonsai
      // gets closed
      app.hide();
    }
  }

  showWindow(showAsFloating = false) {
    this.setWindowFloating(showAsFloating);

    this.mainWindow.setAlwaysOnTop(true, 'pop-up-menu');

    // this.overlayView.webContents.send('cancel-animation-frame');

    const mousePoint = screen.getCursorScreenPoint();
    const display = { activeDisplay: screen.getPrimaryDisplay() };
    display.activeDisplay = screen.getDisplayNearestPoint(mousePoint);
    this.setDisplay(screen.getDisplayNearestPoint(mousePoint));

    this.mainWindow.setVisibleOnAllWorkspaces(true, {
      visibleOnFullScreen: true,
    });
    if (
      process.platform === 'darwin' ||
      process.platform === 'linux' ||
      !this.mainWindow.isVisible()
    ) {
      this.mainWindow.show();
    }
    if (process.platform !== 'darwin' && process.platform !== 'linux') {
      this.mainWindow.restore();
    }
    if (process.platform === 'darwin') {
      app.dock.show();
    }
    this.mainWindow.setVisibleOnAllWorkspaces(false, {
      visibleOnFullScreen: true,
    });
    this.mainWindow.setOpacity(1.0);
    this.resizeBrowserWindow();

    if (process.platform === 'linux') {
      this.mainWindow.setResizable(true);
      this.mainWindow.maximize();
      setTimeout(() => {
        this.mainWindow.setResizable(false);
      }, 100);
    }

    this.tabPageView.webContents.focus();
    setTimeout(() => {
      this.tabPageView.webContents.send('focus-search');
    }, 100);

    setTimeout(() => {
      this.handleResize();
    }, 100);

    // this.handleResize()

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
    //   this.mainWindow.setOpacity(this.easeOut(opacity));
    // }, 10);
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

  // tabs

  createNewTab(parentId?: number): number {
    const newTabView = this.createTabView(
      this.mainWindow,
      this.urlPeekView,
      this.findView
    );
    const { id } = newTabView;
    this.allWebViews[id] = newTabView;
    this.tabPageView.webContents.send('tabView-created-with-id', [
      id,
      parentId,
    ]);
    return id;
  }

  removeTabs(ids: number[]) {
    if (ids.length === 0) {
      return;
    }

    const tabs = ids.map((id) => {
      const tabView = this.allWebViews[id];
      if (typeof tabView !== 'undefined') {
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
      }
      return {
        url: '',
        title: '',
        favicon: '',
        imgString: '',
        scrollHeight: 0,
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

    // this.tabPageView.webContents.send('close-history-modal');

    for (let i = 0; i < tabs.length; i += 1) {
      this.loadTabFromTabInfo(tabs[i]);
    }
  }

  unSetTab(shouldScreenshot = true, shouldFocusSearch = false) {
    const oldTabView = this.allWebViews[this.activeTabId];

    // move title bar off screen
    const windowSize = currentWindowSize(this.mainWindow);

    // move webview off screen (to be removed after screenshot)
    if (typeof oldTabView !== 'undefined') {
      const oldBounds = oldTabView.view.getBounds();
      const webViewBounds = {
        x: oldBounds.x,
        y: oldBounds.y + windowSize[1] + 1,
        width: oldBounds.width,
        height: oldBounds.height,
      };
      // todo on non-macOS this breaks the screenshot functionality and has somthing to do with resizing the webview
      // by the url bar offset height
      // go look at git TAG: bad-image-fix
      if (process.platform === 'darwin') {
        oldTabView.view.setBounds(webViewBounds);
      }
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
    if (shouldFocusSearch) {
      this.tabPageView.webContents.send('focus-search');
    }

    if (windowHasView(this.mainWindow, this.findView)) {
      this.closeFind();
    }

    // screenshot page if needed
    let cachedId;
    if (shouldScreenshot && typeof oldTabView !== 'undefined') {
      cachedId = this.activeTabId;
      this.screenShotTab(cachedId, oldTabView, cleanupBrowser);
    } else {
      cleanupBrowser();
    }

    this.activeTabId = -1;

    // tell tab page that it is active
    this.tabPageView.webContents.send('set-active', true);
    this.tabPageView.webContents.send('unset-tab', cachedId);
  }

  selectNeighborTab(side: 'left' | 'right') {
    if (this.activeTabId !== -1) {
      this.tabPageView.webContents.send('select-neighbor-tab', side);
    }
  }

  setTab(_id: number | string, shouldScreenshot = true) {
    let id;
    if (typeof _id === 'string') {
      id = parseInt(_id, 10);
    } else {
      id = _id;
    }
    if (id === -1) {
      throw new Error('Use unSetTab instead of setTab(-1)!');
    }

    if (this.activeTabId === id) {
      return;
    }

    const oldTabView = this.allWebViews[this.activeTabId];

    const cleanupBrowser = () => {
      // if old tab does not exist remove it
      if (typeof oldTabView !== 'undefined') {
        this.mainWindow.removeBrowserView(oldTabView.view);
      }
    };

    if (shouldScreenshot && oldTabView) {
      const cachedId = this.activeTabId;
      this.screenShotTab(cachedId, oldTabView, cleanupBrowser);
    } else {
      cleanupBrowser();
    }

    // close the text finder
    this.closeFind();

    this.activeTabId = id;

    // tell main window that it is active and get the tabview reference
    this.mainWindow.webContents.send('set-active', true);
    this.tabPageView.webContents.send('set-active', false);
    const tabView = this.allWebViews[id];
    if (typeof tabView === 'undefined') {
      log(`setTab: tab with id ${id} does not exist`);
      return;
      // throw new Error();
    }

    // add the live page to the main window and focus it a little bit later
    this.mainWindow.addBrowserView(tabView.view);
    setTimeout(() => {
      // mouse icons dont switch properly on macOS after closing and opening a BrowserView
      // unless we time this out for some reason :/
      tabView.view.webContents?.focus();
    }, 100);
    this.activeTabId = id;
    this.tabPageView.webContents.send('tab-was-set', id);

    // load the url if it exists
    if (tabView.unloadedUrl !== '') {
      this.loadUrlInTab(id, tabView.unloadedUrl, false, tabView.scrollHeight);
      tabView.unloadedUrl = '';
    }

    // remove the url peek view if it exists
    if (windowHasView(this.mainWindow, this.urlPeekView)) {
      this.mainWindow.setTopBrowserView(this.urlPeekView);
    }
    // tell the tab page that just accessed some tab
    // this updates the access time
    this.tabPageView.webContents.send('access-tab', id);

    this.handleResize();
  }

  loadText(id: number, url: string, options: LoadTextOptions) {
    const {
      dontActuallyLoadUrl = false,
      scrollHeight = 0,
      handleLoaded = () => {},
      searchPattern = 'https://www.google.com/search?q=%s',
    } = options;

    if (id === -1 || url === '') {
      return;
    }
    const tabView = this.allWebViews[id];
    if (typeof tabView === 'undefined') {
      throw new Error(
        `load-url-in-active-tab: tab with id ${id} does not exist`
      );
    }

    const fullUrl = stringToUrl(url, searchPattern);

    (async () => {
      if (!dontActuallyLoadUrl) {
        await tabView.view.webContents
          .loadURL(fullUrl)
          .then(handleLoaded)
          .catch(() => {
            // failed to load url
            // todo: handle this
            console.log(`error loading url: ${fullUrl}`);
            console.log('todo: handle this? callback is not called?');
          });
        tabView.view.webContents.send('scroll-to', scrollHeight);
      } else {
        tabView.unloadedUrl = fullUrl;
      }
      const newUrl = dontActuallyLoadUrl
        ? fullUrl
        : tabView.view.webContents.getURL();
      this.closeFind();
      this.tabPageView.webContents.send('url-changed', [id, newUrl]);
      updateWebContents(this.tabPageView, id, tabView.view);
    })();
  }

  loadUrlInTab(
    id: number,
    url: string,
    dontActuallyLoadUrl = false,
    scrollHeight = 0,
    handleLoaded?: () => void
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

    (async () => {
      if (!dontActuallyLoadUrl) {
        await tabView.view.webContents
          .loadURL(fullUrl)
          .then(handleLoaded)
          .catch(() => {
            // failed to load url
            // todo: handle this
            console.log(`error loading url: ${fullUrl}`);
            console.log('todo: handle this? callback is not called?');
          });
        tabView.view.webContents.send('scroll-to', scrollHeight);
      } else {
        tabView.unloadedUrl = fullUrl;
      }
      const newUrl = dontActuallyLoadUrl
        ? fullUrl
        : tabView.view.webContents.getURL();
      this.closeFind();
      this.tabPageView.webContents.send('url-changed', [id, newUrl]);
      updateWebContents(this.tabPageView, id, tabView.view);
    })();
  }

  tabBack(id: number) {
    if (!this.allWebViews[id]) {
      return;
    }
    if (
      this.allWebViews[id].view.webContents &&
      this.allWebViews[id].view.webContents.canGoBack()
    ) {
      this.closeFind();
      goBack(this.allWebViews[id], [this.tabPageView]);
    }
    updateWebContents(this.tabPageView, id, this.allWebViews[id].view);
  }

  tabForward(id: number) {
    if (!this.allWebViews[id]) {
      return;
    }
    if (this.allWebViews[id].view.webContents.canGoForward()) {
      this.closeFind();
      this.allWebViews[id].view.webContents.goForward();
    }
    updateWebContents(this.tabPageView, id, this.allWebViews[id].view);
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
      const savePath = path.join(app.getPath('userData'), 'history');
      const historyString = stringifyMap(this.historyMap);
      fs.writeFileSync(savePath, historyString);
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

  float(direction: string) {
    if (this.windowFloating && this.floatingDirection === direction) {
      return;
    }

    if (process.platform === 'linux') {
      this.mainWindow.unmaximize();
    }

    this.floatingDirection = direction;

    this.setWindowFloating(true);

    this.resizeBrowserWindow();

    this.handleResize();
  }

  handleResize() {
    const window = this.mainWindow;

    // update renderer inner bounds
    const bounds = this.innerBounds();
    const windowSize = currentWindowSize(window);
    this.tabPageView.webContents.send('set-bounds', {
      windowSize: { width: windowSize[0], height: windowSize[1] },
      bounds,
      topPadding: this.notchSize(),
    });

    resizeFindView(this.findView, headerHeight, bounds);
    resizePeekView(this.urlPeekView, bounds);
    // resizeOverlayView(this.overlayView, windowSize);

    // resize tab page view
    this.tabPageView.setBounds({
      x: 0,
      y: 0,
      width: windowSize[0],
      height: windowSize[1],
    });

    // resize active web view
    const activeView = this.allWebViews[this.activeTabId];
    if (activeView) {
      const sideBarWidth = this.windowFloating ? 0 : tagSideBarWidth;
      activeView.view.setBounds({
        x: bounds.x + sideBarWidth,
        y: bounds.y + headerHeight,
        width: bounds.width - sideBarWidth,
        height: bounds.height - headerHeight,
      });
    }
  }

  // no notch size api yet? so this is the workaround
  notchSize() {
    const aspectRatio = this.display.size.width / this.display.size.height;
    const aspectRatio16By10 = 16 / 10;
    const maybeHasNotch = aspectRatio < aspectRatio16By10;

    const possibleNotchSize = this.display.workArea.y - this.display.bounds.y;

    return maybeHasNotch &&
      process.platform === 'darwin' &&
      !this.windowFloating
      ? possibleNotchSize
      : 0;
  }

  innerBounds(): Electron.Rectangle {
    const windowBounds = this.mainWindow.getBounds();

    const topPadding = 70 + this.notchSize();
    const padding = this.windowFloating ? 3 : 20;

    return {
      x: padding,
      y: topPadding,
      width: windowBounds.width - padding * 2,
      height: windowBounds.height - topPadding - padding,
    };
  }

  toggle(mouseInBorder: boolean) {
    if (this.noWebPageOpen()) {
      if (this.historyModalActive) {
        this.tabPageView.webContents.send('close-history-modal');
      } else {
        this.hideWindow();
      }
    } else if (this.activeTabId !== -1) {
      const findIsActive = windowHasView(this.mainWindow, this.findView);
      if (findIsActive && !mouseInBorder) {
        this.closeFind();
      } else {
        this.unSetTab();
      }
    }
  }

  focusMainSearch() {
    this.tabPageView.webContents.focus();
    this.tabPageView.webContents.send('focus-main');
  }

  setGesture(webViewId: number, gesture: boolean) {
    const view = this.allWebViews[webViewId];
    if (view) {
      view.gestureAfterDOMLoad = gesture;
    }
  }

  // todo remove the tabid params since its in webview
  screenShotTab(
    tabId: number,
    tabView: IWebView,
    callback?: () => void,
    forItemWithId = '',
    workspaceId = ''
  ) {
    tabView.view.webContents.send('get-scroll-height', tabId);
    const handleImage = (image: NativeImage) => {
      const jpgBuf = image.toJPEG(50);
      // const imgHash = createHash('sha256')
      //   .update(jpgBuf)
      //   .digest('hex')
      //   .toUpperCase();
      const tabImgName = uuidv4();
      try {
        const imagesDir = path.join(app.getPath('userData'), 'images');
        fs.mkdirSync(imagesDir, { recursive: true });
        const tabImgPath = path.join(imagesDir, `${tabImgName}.jpg`);
        fs.writeFileSync(tabImgPath, jpgBuf);
      } catch {
        //
      }
      if (!forItemWithId) {
        if (tabView.imgString) {
          try {
            fs.rmSync(
              path.join(
                app.getPath('userData'),
                'images',
                `${tabView.imgString}.jpg`
              )
            );
          } catch {
            //
          }
        }
        tabView.imgString = tabImgName;
        this.tabPageView.webContents.send('tab-image-native', [
          tabId,
          tabImgName,
        ]);
      } else {
        this.tabPageView.webContents.send('got-screenshot-for-item', {
          itemId: forItemWithId,
          workspaceId,
          imgName: tabImgName,
        });
      }
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

  toggleAppShortcut = '';

  hotkeysDisabled = false;

  viewedToggleAppPageInOnboarding = false;

  disableHotkeys() {
    globalShortcut.unregister(this.toggleAppShortcut);
    this.hotkeysDisabled = true;
  }

  enableHotkeys() {
    this.hotkeysDisabled = false;
    this.bindToggleShortcut(this.toggleAppShortcut);
  }

  bindToggleShortcut(newShortCut: string) {
    if (this.toggleAppShortcut !== '') {
      globalShortcut.unregister(this.toggleAppShortcut);
    }
    this.toggleAppShortcut = newShortCut;
    if (process.env.NODE_ENV === 'development' && newShortCut) {
      this.toggleAppShortcut = `Ctrl+${this.toggleAppShortcut}`;
    }
    const shortCut = this.toggleAppShortcut;
    if (shortCut === '') {
      return;
    }
    if (this.hotkeysDisabled) {
      return;
    }
    globalShortcut.register(shortCut, () => {
      if (!this.saveData.data.session && this.onboardingWindow) {
        return;
      }
      if (this.saveData.data.session && this.onboardingWindow) {
        if (!this.viewedToggleAppPageInOnboarding) {
          return;
        }
        // this.saveData.data.loggedIn = true;
        this.saveData.data.toggledOnce = true;
        this.saveData.save();
        this.onboardingWindow?.destroy();
        this.onboardingWindow = null;
      }
      if (this.windowActive()) {
        this.mixpanelManager.track('hide with global shortcut', {
          shortcut: shortCut,
        });
        this.hideWindow();
      } else {
        this.mixpanelManager.track('show with global shortcut', {
          shortcut: shortCut,
        });
        this.showWindow();
      }
    });
  }

  windowActive() {
    const windowHidden =
      ((process.platform === 'darwin' || process.platform === 'linux') &&
        !this.mainWindow.isVisible()) ||
      (process.platform !== 'darwin' && this.mainWindow.isMinimized());
    return !windowHidden;
  }

  private mouseInInner() {
    const bounds = this.innerBounds();
    const mousePos = screen.getCursorScreenPoint();
    const windowBounds = this.mainWindow.getBounds();

    mousePos.x -= windowBounds.x;
    mousePos.y -= windowBounds.y;

    return pointInBounds(mousePos, bounds);
  }

  private removeTab(id: number, deleteImageOnDisk = true) {
    const tabView = this.allWebViews[id];
    if (typeof tabView === 'undefined') {
      log(`remove-tab: tab with id ${id} does not exist`);
      return;
    }
    if (deleteImageOnDisk) {
      try {
        fs.rmSync(
          path.join(
            app.getPath('userData'),
            'images',
            `${tabView.imgString}.jpg`
          )
        );
      } catch {
        //
      }
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
      const historySavePath = path.join(app.getPath('userData'), 'history');
      const saveString = fs.readFileSync(historySavePath, 'utf8');
      let saveMap;
      const r1 = tryParseMap(tryDecrypt(saveString));
      if (r1.success) {
        saveMap = r1.map;
      } else {
        const r2 = tryParseMap(saveString);
        if (r2.success) {
          saveMap = r2.map;
        } else {
          this.loadTabs();
          return;
        }
      }
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
    } catch {
      // console.log('loadHistory error');
      // console.log(e);
    }
    this.loadTabs();
  }

  private loadTabs() {
    this.loadedOpenTabs = true;
    try {
      const openTabsSavePath = path.join(app.getPath('userData'), 'openTabs');
      const saveString = fs.readFileSync(openTabsSavePath, 'utf8');
      let saveData;

      const r1 = tryParseJSON(tryDecrypt(saveString));
      if (r1.success) {
        saveData = r1.object;
      } else {
        const r2 = tryParseJSON(saveString);
        if (r2.success) {
          saveData = r2.object;
        } else {
          return;
        }
      }

      saveData.forEach((tab: TabInfo) => {
        const isUUID =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            tab.imgString
          );
        if (!isUUID) {
          tab.imgString = base64ImgToDisk(
            tab.imgString,
            path.join(app.getPath('userData'), 'images')
          );
        }
        this.loadTabFromTabInfo(tab);
      });
    } catch {
      //
    }
  }

  private resizeBrowserWindow() {
    const { display } = this;

    let bounds;
    if (this.windowFloating) {
      const displayBounds = display.workArea;
      const width = Math.floor(
        (displayBounds.width - floatingWindowEdgeMargin) * 0.45
      );
      if (this.floatingDirection === 'left') {
        bounds = {
          x: displayBounds.x + floatingWindowEdgeMargin,
          y: displayBounds.y + floatingWindowEdgeMargin,
          width,
          height: displayBounds.height - floatingWindowEdgeMargin * 2,
        };
      } else {
        bounds = {
          x:
            displayBounds.x +
            displayBounds.width -
            width -
            floatingWindowEdgeMargin,
          y: displayBounds.y + floatingWindowEdgeMargin,
          width,
          height: displayBounds.height - floatingWindowEdgeMargin * 2,
        };
      }
    } else {
      const extraPixel = process.platform === 'darwin' ? 0 : 1; // todo: on windows if you make it the same size as monitor, everything breaks!?!??!?!?
      bounds = {
        x: display.bounds.x,
        y: display.bounds.y,
        width: display.bounds.width,
        height: display.bounds.height + extraPixel,
      };
    }

    this.mainWindow.setBounds(bounds);
  }

  unFloat() {
    this.setWindowFloating(false);
    this.resizeBrowserWindow();

    if (process.platform === 'linux') {
      this.mainWindow.setResizable(true);
      this.mainWindow.maximize();
      setTimeout(() => {
        this.mainWindow.setResizable(false);
      }, 100);
    }

    this.handleResize();
  }

  padding(): number {
    return this.windowFloating ? 10 : this.browserPadding();
  }

  private noWebPageOpen(): boolean {
    return this.activeTabId === -1;
  }

  handleAppActivate() {
    if (this.saveData.data.session) {
      this.showWindow();
    } else if (this.onboardingWindow && !this.onboardingWindow.isDestroyed()) {
      this.onboardingWindow.show();
    } else {
      this.onboardingWindow = this.initOnboardingWindow();
    }
  }

  handleAppBeforeQuit() {
    this.mainWindow?.destroy();
  }

  handleGoBack(senderId: string) {
    log(`${senderId} request go back`);
    const webView = this.allWebViews[parseInt(senderId, 10)];
    if (webView) {
      if (webView.view.webContents.canGoBack()) {
        log(`${senderId} can go back`);
        goBack(webView, [this.tabPageView]);
      }
    } else {
      log(`Failed to find webView for ${senderId}`);
    }
  }

  openWindow(
    view: IWebView,
    url: string,
    alertTargets: BrowserView[],
    senderId?: number
  ) {
    const newWindowId = this.createNewTab(senderId);

    if (senderId) {
      alertTargets.forEach((target) => {
        target.webContents.send('set-tab-parent', [newWindowId, senderId]);
      });
    }
    const newWebView = this.allWebViews[newWindowId];
    if (newWebView) {
      const bounds = this.innerBounds();
      const windowSize = currentWindowSize(this.mainWindow);
      const hiddenBounds = {
        x: bounds.x,
        y: bounds.y + windowSize[1] + 1,
        width: bounds.width,
        height: bounds.height,
      };
      // wm.resizeWebView(newWebView, hiddenBounds);

      log(`og bounds are ${JSON.stringify(newWebView.view.getBounds())}`);
      newWebView.view.setBounds(hiddenBounds);
      log(`set bounds as ${JSON.stringify(hiddenBounds)}`);
      log(`bounds are now ${JSON.stringify(newWebView.view.getBounds())}`);
      if (!windowHasView(this.mainWindow, newWebView.view)) {
        this.mainWindow.addBrowserView(newWebView.view);
      }
    }

    let didScreenshot = false;

    const loadedUrlCallback = () => {
      log(
        `url loaded and bounds are ${JSON.stringify(
          newWebView.view.getBounds()
        )}`
      );
      if (didScreenshot) {
        return;
      }
      didScreenshot = true;
      if (windowHasView(this.mainWindow, newWebView.view)) {
        const screenshotCallback = () => {
          if (this.activeTabId !== newWebView.id) {
            this.mainWindow.removeBrowserView(newWebView.view);
            log(
              `remove ${
                view.id
              } after loaded ${url} with bounds ${JSON.stringify(
                newWebView.view.getBounds()
              )}`
            );
          }
        };
        this.screenShotTab(newWebView.id, newWebView, screenshotCallback);
      }
    };

    setTimeout(() => {
      loadedUrlCallback();
    }, 750);

    this.loadUrlInTab(newWindowId, url, false, 0, loadedUrlCallback);
    alertTargets.forEach((target) => {
      target.webContents.send('new-window', {
        senderId: view.id,
        receiverId: newWindowId,
        url,
      });
    });
  }

  logOut() {
    this.viewedToggleAppPageInOnboarding = false;
    this.removeTabs(Object.values(this.allWebViews).map((tab) => tab.id));
    saveTabs(this.allWebViews);
    this.saveData.data.session = undefined;
    this.saveData.save();
    /// todo maybe reloading this is sketchy?
    this.tabPageView.webContents.loadURL(TAB_PAGE);
    setTimeout(() => {
      this.hideWindow();
      if (!this.onboardingWindow) {
        this.onboardingWindow = this.initOnboardingWindow();
      }
    }, 250);
  }

  setWindowFloating(windowFloating: boolean) {
    // if (process.platform === 'darwin') {
    //   if (windowFloating) {
    //     this.mainWindow.setVibrancy(null);
    //   } else {
    //     this.mainWindow.setVibrancy(VIBRANCY);
    //   }
    // }
    this.windowFloating = windowFloating;
    this.tabPageView.webContents.send('set-window-floating', windowFloating);
  }

  setDisplay(display: Display) {
    this.display = display;
    this.resizeBrowserWindow();
  }

  webBrowserViewActive(): boolean {
    return this.activeTabId !== -1;
  }

  browserPadding(noWebPageOpen?: boolean): number {
    let noPageOpen = noWebPageOpen;
    if (typeof noWebPageOpen === 'undefined') {
      noPageOpen = this.noWebPageOpen();
    }
    if (this.display !== null) {
      const ratio = noPageOpen ? 50 : 15;
      return Math.floor(this.display.workAreaSize.height / ratio);
    }
    return 35;
  }

  initOnboardingWindow() {
    const onboardingWindow = makeOnboardingWindow();
    onboardingWindow.webContents.on('did-finish-load', () => {
      this.onboardingWindowReady = true;
      const route = this.saveData.data.toggledOnce ? 'login' : 'create-account';
      this.onboardingWindow?.webContents.send('history-push', route);
      if (this.saveData.data.toggledOnce) {
        this.onboardingWindow?.webContents.send('toggled-once');
      }
      if (this.mainWindowReady) {
        showOnboardingWindow(onboardingWindow);
      }
    });
    return onboardingWindow;
  }

  initBoot() {
    let booted = false;
    const boot = () => {
      if (!booted) {
        booted = true;
        this.mainWindowReady = true;
        if (this.onboardingWindowReady) {
          showOnboardingWindow(this.onboardingWindow);
        }
        if (this.saveData.data.session) {
          this.showWindow();
        }
      }
    };
    this.tabPageView.webContents.on('did-finish-load', boot);
    setTimeout(boot, 15000);
  }

  openAndFloatLeft() {
    this.showWindow(true);
    this.float('left');
  }

  openAndFloatRight() {
    this.showWindow(true);
    this.float('right');
  }

  addListeners() {
    ipcMain.on('create-new-tab', (_, switchToTab = false) => {
      const id = this.createNewTab();
      if (switchToTab) {
        this.setTab(id);
        this.tabPageView.webContents.focus();
      }
    });
    ipcMain.on('remove-tab', (_, id) => {
      this.removeTabs([id]);
    });
    ipcMain.on('remove-tabs', (_, ids) => {
      this.removeTabs(ids);
    });
    ipcMain.on('set-tab', (_, id) => {
      this.setTab(id);
    });
    ipcMain.on('load-url-in-tab', (_, [id, url]) => {
      this.loadUrlInTab(id, url);
    });
    ipcMain.on('load-text-in-tab', (_, [id, text, searchPattern]) => {
      this.loadText(id, text, { searchPattern });
    });
    ipcMain.on('tab-back', (_, id) => {
      this.tabBack(id);
    });
    ipcMain.on('tab-forward', (_, id) => {
      this.tabForward(id);
    });
    ipcMain.on('tab-refresh', (_, id) => {
      this.tabRefresh(id);
    });
    ipcMain.on('close-find', () => {
      this.closeFind();
    });
    ipcMain.on('find-text-change', (_, boxText) => {
      this.findTextChange(boxText);
    });
    ipcMain.on('find-previous', () => {
      this.findPrevious();
    });
    ipcMain.on('find-next', () => {
      this.findNext();
    });
    ipcMain.on('wheel', (_, [deltaX, deltaY]) => {
      const activeTabView = this.allWebViews[this.activeTabId];
      if (activeTabView !== null) {
        activeTabView.view.webContents
          .executeJavaScript(
            `
        {
          window.scrollBy(${deltaX}, ${deltaY});
        }
      `,
            true
          )
          .catch(console.log);
      }
    });
    ipcMain.on('search-url', (_, [text, searchPattern]) => {
      this.tabPageView.webContents.send('close-history-modal');
      const newTabId = this.createNewTab();
      this.loadText(newTabId, text, { searchPattern });
      this.setTab(newTabId);
    });
    ipcMain.on('history-search', (_, query) => {
      if (query === '') {
        this.tabPageView.webContents.send('history-search-result', null);
      } else {
        const result = this.historyFuse.search(query, { limit: 50 });
        this.tabPageView.webContents.send(
          'history-search-result',
          result.map((entry: { item: HistoryEntry }) => {
            return entry.item;
          })
        );
      }
    });
    ipcMain.on('history-modal-active-update', (_, historyModalActive) => {
      this.historyModalActive = historyModalActive;
    });
    ipcMain.on('clear-history', () => {
      this.clearHistory();
    });
    ipcMain.on('toggle', () => {
      this.toggle(true);
    });
    ipcMain.on('click-main', () => {
      if (this.webBrowserViewActive()) {
        this.unSetTab();
      }
    });
    ipcMain.on('unset-tab', () => {
      if (this.webBrowserViewActive()) {
        this.unSetTab(true, false);
      }
    });
    ipcMain.on('open-workspace-url', (_, url) => {
      this.tabPageView.webContents.send('close-history-modal');

      let tabExists = false;

      Object.values(this.allWebViews).forEach((tabView) => {
        const tabUrl = tabView.view.webContents.getURL();
        if (baseUrl(tabUrl) === baseUrl(url)) {
          this.setTab(tabView.id);
          tabExists = true;
        }
      });

      if (!tabExists) {
        const newTabId = this.createNewTab();
        this.loadUrlInTab(newTabId, url);
        this.setTab(newTabId);
      }
    });
    ipcMain.on('request-user-data-path', (event) => {
      const userDataPath = app.getPath('userData');
      event.sender.send('user-data-path', userDataPath);
    });
    ipcMain.on('request-data-path', () => {
      this.tabPageView.webContents.send(
        'set-data-path',
        app.getPath('userData')
      );
    });
    ipcMain.on('open-graph-data', (_, data: OpenGraphInfo) => {
      const tabView = this.allWebViews[this.activeTabId];
      if (typeof tabView !== 'undefined') {
        if (tabView.historyEntry?.openGraphData.title === 'null') {
          tabView.historyEntry.openGraphData = data;
          this.addHistoryEntry(tabView.historyEntry);
        }
      }
    });
    ipcMain.on('scroll-height', (_, [id, height]) => {
      const tabView = this.allWebViews[id];
      if (typeof tabView !== 'undefined') {
        tabView.scrollHeight = height;
      }
    });
    ipcMain.on('go-back', (_, data) => {
      const { senderId }: { senderId: string; backTo: INode } = data;
      this.handleGoBack(senderId);
    });
    ipcMain.on('go-forward', (_, eventData) => {
      const { senderId } = eventData;
      // const { data: historyData }: INode = forwardTo;
      // const { url }: Instance<typeof HistoryData> = historyData;
      const webView = this.allWebViews[senderId];
      if (webView) {
        handleGoForward(webView, [this.tabPageView]);
      }
    });
    ipcMain.on('gesture', (event, data) => {
      log(`\n${event.sender.id} GESTURE ${data}`);
      this.setGesture(event.sender.id, true);
      this.tabPageView.webContents.send('gesture', { id: event.sender.id });
    });
    ipcMain.on('dom-content-loaded', (event) => {
      log(`\n${event.sender.id} DOM LOADED`);
      this.setGesture(event.sender.id, false);
    });
    ipcMain.on('request-new-window', (_, { senderId, url }) => {
      log(`${senderId} request-new-window for ${url}`);
      const webView = this.allWebViews[senderId];
      if (webView && url) {
        this.openWindow(webView, url, [this.tabPageView], senderId);
      }
    });
    ipcMain.on('request-screenshot', (_, { webViewId }) => {
      const webView = this.allWebViews[webViewId];
      if (webView) {
        log(`taking screenshot of ${webViewId} by request`);
        this.screenShotTab(webViewId, webView);
      }
    });
    ipcMain.on('created-workspace-item', (_, [itemId, workspaceId]) => {
      const webView = this.allWebViews[this.activeTabId];
      if (webView) {
        this.screenShotTab(
          this.activeTabId,
          webView,
          () => {},
          itemId,
          workspaceId
        );
      }
    });
    ipcMain.on('mixpanel-track', (_, eventName) => {
      this.mixpanelManager.track(eventName);
    });
    ipcMain.on(
      'mixpanel-track-with-props',
      (_, [eventName, properties = {}]) => {
        this.mixpanelManager.track(eventName, properties);
      }
    );
    // ipcMain.on(
    //   'mixpanel-track-with-properties',
    //   (_, [eventName, properties]) => {
    //     this.mixpanelManager.track(eventName, properties);
    //   }
    // );
    ipcMain.on('log-data', (_, data) => {
      console.log(data);
    });
    ipcMain.on('disable-hotkeys', () => {
      this.disableHotkeys();
    });
    ipcMain.on('enable-hotkeys', () => {
      this.enableHotkeys();
    });
    ipcMain.on('rebind-hotkey', (sender, { hotkeyId, newBind }) => {
      const electronBind = translateKeys(newBind).join('+');
      switch (hotkeyId) {
        case 'toggle-app':
          this.bindToggleShortcut(electronBind);
          if (sender.processId !== this.tabPageView.webContents.id) {
            this.tabPageView.webContents.send(
              'update-toggle-app-hotkey',
              newBind
            );
          }
          break;
        default:
          break;
      }
    });
    ipcMain.on('unfloat-button', () => {
      if (this.windowFloating) {
        this.mixpanelManager.track('unfloat window by clicking button');
        this.unFloat();
      }
    });
    ipcMain.on('go-back-from-floating', () => {
      this.tabPageView.webContents.send('go-back-from-floating');
    });
    ipcMain.on('dismiss-email-notification', () => {
      this.saveData.data.seenEmailForm = true;
      this.saveData.save();
      this.tabPageView.webContents.send('set-seenEmailForm', true);
    });
    // ipcMain.on('set-email', (_, email) => {
    //   this.mixpanelManager.mixpanel.people.set(this.mixpanelManager.userId, {
    //     email,
    //   });
    // });
    ipcMain.on('sign-in-session', (_, session) => {
      this.tabPageView.webContents.send('session', session);
      this.saveData.data.session = session;
      this.saveData.save();
    });
    ipcMain.on('refresh-session', (_, session) => {
      this.mixpanelManager.loggedIn(session);
      this.saveData.data.session = session;
      this.saveData.save();
    });
    ipcMain.on('clear-session', () => {
      this.mixpanelManager.loggedOut();
      this.logOut();
    });
    ipcMain.on('request-session', () => {
      if (this.saveData.data.session) {
        this.tabPageView.webContents.send(
          'session',
          this.saveData.data.session
        );
      }
    });
    ipcMain.on('viewed-toggle-page', () => {
      this.viewedToggleAppPageInOnboarding = true;
    });
    ipcMain.on('update-tab-view', (_, tabView) => {
      this.saveData.data.tabView = tabView;
      this.saveData.save();
    });
    ipcMain.on('move-floating-window-left', () => {
      this.float('left');
    });
    ipcMain.on('move-floating-window-right', () => {
      this.float('right');
    });
    ipcMain.on('move-floating-window-max', () => {
      this.showWindow();
    });
  }
}
