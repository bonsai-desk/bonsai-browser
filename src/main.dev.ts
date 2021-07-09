/* eslint global-require: off, no-console: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `yarn build` or `yarn build:main`, this file is compiled to
 * `./src/main.prod.js` using webpack. This gives us some performance wins.
 */
import 'core-js/stable';
import 'regenerator-runtime/runtime';
import path from 'path';
import {
  app,
  BrowserWindow,
  BrowserView,
  shell,
  ipcMain,
  Menu,
  MenuItem,
  Tray,
  globalShortcut,
  screen,
} from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import MenuBuilder from './menu';
// eslint-disable-next-line import/no-cycle
import TabView, { headerHeight } from './tab-view';

export default class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;

// let debugWindow: BrowserWindow | null = null;

// function hookDebugWindow(infoDebugger: WebContents) {
//   ipcMain.on('meta-info', (_, data) => {
//     // console.log(data);
//     // debugWindow.event.reply('meta-info', data);
//     infoDebugger.send('meta-info', data);
//   });
// }

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

if (
  process.env.NODE_ENV === 'development' ||
  process.env.DEBUG_PROD === 'true'
) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload
    )
    .catch(console.log);
};

const tabViews: Record<number, TabView> = {};
let activeTabId = -1;

export const windowHasView = (
  window: BrowserWindow,
  view: BrowserView
): boolean => {
  const views = window.getBrowserViews();
  for (let i = 0; i < views.length; i += 1) {
    if (views[i] === view) {
      return true;
    }
  }
  return false;
};

let findText = '';
let lastFindTextSearch = '';

function closeFind(window: BrowserWindow, findView: BrowserView) {
  if (windowHasView(window, findView)) {
    window.removeBrowserView(findView);
    const tabView = tabViews[activeTabId];
    if (typeof tabView !== 'undefined') {
      tabView.view.webContents.stopFindInPage('clearSelection');
      lastFindTextSearch = '';
    }
  }
}

const setTab = (
  window: BrowserWindow,
  titleBarView: BrowserView,
  urlPeekView: BrowserView,
  findView: BrowserView,
  id: number,
  oldId: number
) => {
  if (id === oldId) {
    return;
  }

  const oldTabView = tabViews[oldId];
  if (typeof oldTabView !== 'undefined') {
    window.removeBrowserView(oldTabView.view);
    activeTabId = -1;
  }

  if (id === -1) {
    return;
  }
  const tabView = tabViews[id];
  if (typeof tabView === 'undefined') {
    throw new Error(`setTab: tab with id ${id} does not exist`);
  }

  window.addBrowserView(tabView.view);
  activeTabId = id;
  window.setTopBrowserView(titleBarView);
  closeFind(window, findView);
  if (windowHasView(window, urlPeekView)) {
    window.setTopBrowserView(urlPeekView);
  }
  tabView.resize();
};

function validURL(str: string): boolean {
  const pattern = new RegExp(
    '^(https?:\\/\\/)?' + // protocol
    '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
    '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
    '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
    '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
      '(\\#[-a-z\\d_]*)?$',
    'i'
  ); // fragment locator
  return pattern.test(str);
}

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

function handleFindText(tabView: BrowserView, searchBack?: boolean) {
  if (tabView === null) {
    lastFindTextSearch = '';
    return;
  }
  if (findText === '') {
    // stop finding if find text is empty
    tabView.webContents.stopFindInPage('clearSelection');
    lastFindTextSearch = '';
  } else {
    const shouldSearchBack = typeof searchBack !== 'undefined' && searchBack;
    const sameAsLastSearch = findText === lastFindTextSearch;
    tabView.webContents.findInPage(findText, {
      forward: !shouldSearchBack,
      findNext: !sameAsLastSearch,
    });
  }
  lastFindTextSearch = findText;
}

function addListeners(
  window: BrowserWindow,
  titleBarView: BrowserView,
  urlPeekView: BrowserView,
  findView: BrowserView,
  browserPadding: number
) {
  ipcMain.on('create-new-tab', (_, id) => {
    const tabView = new TabView(
      window,
      id,
      titleBarView,
      urlPeekView,
      findView,
      browserPadding
    );
    tabViews[id] = tabView;
  });
  ipcMain.on('remove-tab', (event, id) => {
    const tabView = tabViews[id];
    if (typeof tabView === 'undefined') {
      throw new Error(`remove-tab: tab with id ${id} does not exist`);
    }
    window.removeBrowserView(tabView.view);
    activeTabId = -1;
    closeFind(window, findView);
    if (windowHasView(window, urlPeekView)) {
      window.removeBrowserView(urlPeekView);
    }
    // eslint-disable-line @typescript-eslint/no-explicit-any
    (tabView.view.webContents as any).destroy();
    delete tabViews[id];
    event.reply('tab-removed', id);
  });
  ipcMain.on('set-tab', (_, [id, oldId]) => {
    setTab(window, titleBarView, urlPeekView, findView, id, oldId);
  });
  ipcMain.on('load-url-in-tab', (event, [id, url]) => {
    if (id === -1 || url === '') {
      return;
    }
    const tabView = tabViews[id];
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
      closeFind(window, findView);
      event.reply('url-changed', [id, newUrl]);
      updateWebContents(event, id, tabView);
    })();
  });
  ipcMain.on('tab-back', (event, id) => {
    if (tabViews[id].view.webContents.canGoBack()) {
      closeFind(window, findView);
      tabViews[id].view.webContents.goBack();
    }
    updateWebContents(event, id, tabViews[id]);
  });
  ipcMain.on('tab-forward', (event, id) => {
    if (tabViews[id].view.webContents.canGoForward()) {
      closeFind(window, findView);
      tabViews[id].view.webContents.goForward();
    }
    updateWebContents(event, id, tabViews[id]);
  });
  ipcMain.on('tab-refresh', (_, id) => {
    closeFind(window, findView);
    tabViews[id].view.webContents.reload();
  });
  ipcMain.on('close-find', () => {
    closeFind(window, findView);
  });
  ipcMain.on('find-text-change', (_, boxText) => {
    findText = boxText;
    const tabView = tabViews[activeTabId];
    if (typeof tabView !== 'undefined') {
      handleFindText(tabView.view);
    }
  });
  ipcMain.on('find-previous', () => {
    const tabView = tabViews[activeTabId];
    if (typeof tabView !== 'undefined') {
      handleFindText(tabView.view, true);
    }
  });
  ipcMain.on('find-next', () => {
    const tabView = tabViews[activeTabId];
    if (typeof tabView !== 'undefined') {
      handleFindText(tabView.view);
    }
  });
}

const RESOURCES_PATH = app.isPackaged
  ? path.join(process.resourcesPath, 'assets')
  : path.join(__dirname, '../assets');

const getAssetPath = (...paths: string[]): string => {
  return path.join(RESOURCES_PATH, ...paths);
};

function createTray() {
  const appIcon = new Tray(getAssetPath('icon.ico'));
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open',
      click() {
        mainWindow?.show();
      },
    },
    {
      label: 'Close',
      click() {
        mainWindow?.hide();
      },
    },
    {
      label: 'Exit',
      click() {
        // app.isQuiting = true;
        app.quit();
      },
    },
  ]);

  appIcon.on('double-click', () => {
    mainWindow?.show();
  });
  appIcon.setToolTip('Bonsai Browser');
  appIcon.setContextMenu(contextMenu);
  return appIcon;
}

const createWindow = async () => {
  if (
    process.env.NODE_ENV === 'development' ||
    process.env.DEBUG_PROD === 'true'
  ) {
    await installExtensions();
  }

  // debugWindow = new BrowserWindow({
  //   width: startWindowWidth,
  //   height: startWindowHeight,
  //   minWidth: 500,
  //   minHeight: headerHeight,
  //   icon: getAssetPath('icon.png'),
  //   webPreferences: {
  //     nodeIntegration: true,
  //   },
  // });

  let browserPadding = 35.0;
  const displays = screen.getAllDisplays();
  if (displays.length > 0) {
    const display = displays[0];
    browserPadding = Math.floor(display.workAreaSize.height / 15.0);
  }

  mainWindow = new BrowserWindow({
    frame: false,
    transparent: true,
    width: 1000,
    height: 1000,
    minWidth: 500,
    minHeight: 500,
    titleBarStyle: 'hidden',
    icon: getAssetPath('icon.png'),
    webPreferences: {
      nodeIntegration: true,
      devTools: false,
    },
  });

  mainWindow.webContents.loadURL(`file://${__dirname}/main-window.html`);

  // debugWindow.loadURL(`file://${__dirname}/index-debug.html`);

  // hookDebugWindow(debugWindow.webContents);

  // open window before loading is complete
  if (process.env.START_MINIMIZED) {
    mainWindow.minimize();
    // debugWindow.minimize();
  } else {
    mainWindow.show();
    mainWindow.focus();

    // debugWindow.show();
  }

  const titleBarView = new BrowserView({
    webPreferences: {
      nodeIntegration: true,
    },
  });
  mainWindow.setBrowserView(titleBarView);
  mainWindow.setTopBrowserView(titleBarView);

  titleBarView.webContents.loadURL(`file://${__dirname}/index.html`);

  const urlPeekWidth = 475;
  const urlPeekHeight = 20;
  const urlPeekView = new BrowserView({
    webPreferences: {
      nodeIntegration: true,
    },
  });

  urlPeekView.webContents.loadURL(`file://${__dirname}/url-peek.html`);

  const findViewWidth = 350;
  const findViewHeight = 50;
  const findViewMarginRight = 20;
  const findView = new BrowserView({
    webPreferences: {
      nodeIntegration: true,
    },
  });
  // findView does not show up from Ctrl+F unless you do this for some reason
  mainWindow.addBrowserView(findView);
  mainWindow.setTopBrowserView(findView);
  mainWindow.removeBrowserView(findView);

  findView.webContents.loadURL(`file://${__dirname}/find.html`);

  addListeners(mainWindow, titleBarView, urlPeekView, findView, browserPadding);

  if (!app.isPackaged) {
    // titleBarView.webContents.openDevTools({
    //   mode: 'detach',
    // });
    // findView.webContents.openDevTools({
    //   mode: 'detach',
    // });
  }

  // used to wait until it is loaded before showing
  // // @TODO: Use 'ready-to-show' event
  // //        https://github.com/electron/electron/blob/master/docs/api/browser-window.md#using-ready-to-show-event
  // mainWindow.webContents.on('did-finish-load', () => {
  //   if (!mainWindow) {
  //     throw new Error('"mainWindow" is not defined');
  //   }
  // });

  mainWindow.on('minimize', (e: Event) => {
    if (mainWindow !== null) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  const resize = () => {
    if (mainWindow) {
      const windowSize = mainWindow.getSize();
      console.log(windowSize);
      console.log(browserPadding);
      console.log(headerHeight);
      console.log(titleBarView);
      titleBarView.setBounds({
        x: browserPadding,
        y: browserPadding,
        width: windowSize[0] - browserPadding * 2,
        height: headerHeight,
      });
      urlPeekView.setBounds({
        x: browserPadding,
        y: windowSize[1] - urlPeekHeight + browserPadding,
        width: urlPeekWidth,
        height: urlPeekHeight,
      });
      findView.setBounds({
        x: windowSize[0] - findViewWidth - findViewMarginRight - browserPadding,
        y: headerHeight + browserPadding,
        width: findViewWidth,
        height: findViewHeight,
      });
    }
  };

  resize();
  mainWindow.on('resize', resize);

  const tray = createTray();

  mainWindow?.setResizable(false);
  mainWindow?.setKiosk(true);

  globalShortcut.register('CmdOrCtrl+\\', () => {
    if (mainWindow?.isVisible()) {
      mainWindow?.hide();
    } else {
      mainWindow?.show();
    }
  });

  mainWindow.on('closed', () => {
    tray.destroy();
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.on('new-window', (event, url) => {
    event.preventDefault();
    shell.openExternal(url);
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();

  const menu = new Menu();

  menu.append(
    new MenuItem({
      label: 'Electron',
      submenu: [
        {
          label: 'find',
          accelerator: 'CmdOrCtrl+F',
          click: () => {
            if (mainWindow !== null && !windowHasView(mainWindow, findView)) {
              mainWindow.addBrowserView(findView);
              mainWindow.setTopBrowserView(findView);
            }

            const tabView = tabViews[activeTabId];
            if (typeof tabView !== 'undefined') {
              findView.webContents.focus();
              findView.webContents.send('open-find');
              handleFindText(tabView.view);
            }
          },
        },
        {
          label: 'stop-find',
          accelerator: 'Escape',
          click: () => {
            if (mainWindow !== null) {
              closeFind(mainWindow, findView);
            }

            const tabView = tabViews[activeTabId];
            if (typeof tabView !== 'undefined') {
              // tabView.view.webContents.findInPage('e');
            }
          },
        },
        // {
        //   label: 'test',
        //   accelerator: 'CmdOrCtrl+T',
        //   click: () => {
        //     createTray();
        //   },
        // },
      ],
    })
  );

  // Menu.buildFromTemplate(menuItems).popup();
  Menu.setApplicationMenu(menu);
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.whenReady().then(createWindow).catch(console.log);

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) createWindow();
});
