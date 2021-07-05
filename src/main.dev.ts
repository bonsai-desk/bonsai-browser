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
  WebContents,
} from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import MenuBuilder from './menu';
import TabView, {
  startWindowWidth,
  startWindowHeight,
  headerHeight,
} from './tab-view';

export default class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;

let debugWindow: BrowserWindow | null = null;

function hookDebugWindow(infoDebugger: WebContents) {
  ipcMain.on('meta-info', (_, data) => {
    // console.log(data);
    // debugWindow.event.reply('meta-info', data);
    infoDebugger.send('meta-info', data);
  });
}

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

const setTab = (
  window: BrowserWindow,
  titleBarView: BrowserView,
  id: number,
  oldId: number
) => {
  if (id === oldId) {
    return;
  }

  const oldTabView = tabViews[oldId];
  if (typeof oldTabView !== 'undefined') {
    window.removeBrowserView(oldTabView.view);
  }

  if (id === -1) {
    return;
  }
  const tabView = tabViews[id];
  if (typeof tabView === 'undefined') {
    throw new Error(`setTab: tab with id ${id} does not exist`);
  }

  window.addBrowserView(tabView.view);
  window.setTopBrowserView(titleBarView);
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

function addListeners(window: BrowserWindow, titleBarView: BrowserView) {
  ipcMain.on('create-new-tab', (_, id) => {
    const tabView = new TabView(window, id, titleBarView);
    tabViews[id] = tabView;
  });
  ipcMain.on('remove-tab', (event, id) => {
    const tabView = tabViews[id];
    if (typeof tabView === 'undefined') {
      throw new Error(`remove-tab: tab with id ${id} does not exist`);
    }
    window.removeBrowserView(tabView.view);
    // eslint-disable-line @typescript-eslint/no-explicit-any
    (tabView.view.webContents as any).destroy();
    delete tabViews[id];
    event.reply('tab-removed', id);
  });
  ipcMain.on('set-tab', (_, [id, oldId]) => {
    setTab(window, titleBarView, id, oldId);
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
      event.reply('url-changed', [id, newUrl]);
      updateWebContents(event, id, tabView);
    })();
  });
  ipcMain.on('tab-back', (event, id) => {
    if (tabViews[id].view.webContents.canGoBack()) {
      tabViews[id].view.webContents.goBack();
    }
    updateWebContents(event, id, tabViews[id]);
  });
  ipcMain.on('tab-forward', (event, id) => {
    if (tabViews[id].view.webContents.canGoForward()) {
      tabViews[id].view.webContents.goForward();
    }
    updateWebContents(event, id, tabViews[id]);
  });
  ipcMain.on('tab-refresh', (_, id) => {
    tabViews[id].view.webContents.reload();
  });
}

const createWindow = async () => {
  if (
    process.env.NODE_ENV === 'development' ||
    process.env.DEBUG_PROD === 'true'
  ) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  debugWindow = new BrowserWindow({
    width: startWindowWidth,
    height: startWindowHeight,
    minWidth: 500,
    minHeight: headerHeight,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      nodeIntegration: true,
    },
  });

  if (process.platform === 'darwin') {
    mainWindow = new BrowserWindow({
      frame: false,
      titleBarStyle: 'hidden',
      width: startWindowWidth,
      height: startWindowHeight,
      minWidth: 500,
      minHeight: headerHeight,
      icon: getAssetPath('icon.png'),
      webPreferences: {
        nodeIntegration: true,
      },
    });
  } else {
    mainWindow = new BrowserWindow({
      frame: false,
      titleBarStyle: 'hidden',
      width: startWindowWidth,
      height: startWindowHeight,
      minWidth: 500,
      minHeight: headerHeight + 50,
      icon: getAssetPath('icon.png'),
      webPreferences: {
        nodeIntegration: true,
      },
    });
  }

  debugWindow.loadURL(`file://${__dirname}/index-debug.html`);

  hookDebugWindow(debugWindow.webContents);

  // open window before loading is complete
  if (process.env.START_MINIMIZED) {
    mainWindow.minimize();
    debugWindow.minimize();
  } else {
    mainWindow.show();
    mainWindow.focus();

    debugWindow.show();
  }

  const titleBarView = new BrowserView({
    webPreferences: {
      nodeIntegration: true,
    },
  });
  mainWindow.setBrowserView(titleBarView);
  mainWindow.setTopBrowserView(titleBarView);
  titleBarView.setBounds({
    x: 0,
    y: 0,
    width: startWindowWidth,
    height: headerHeight,
  });

  titleBarView.webContents.loadURL(`file://${__dirname}/index.html`);

  addListeners(mainWindow, titleBarView);

  mainWindow.on('resize', () => {
    if (mainWindow) {
      const windowSize = mainWindow.getSize();
      titleBarView.setBounds({
        x: 0,
        y: 0,
        width: windowSize[0],
        height: headerHeight,
      });
    }
  });

  if (!app.isPackaged) {
    titleBarView.webContents.openDevTools({
      mode: 'detach',
    });
  }

  // used to wait until it is loaded before showing
  // // @TODO: Use 'ready-to-show' event
  // //        https://github.com/electron/electron/blob/master/docs/api/browser-window.md#using-ready-to-show-event
  // mainWindow.webContents.on('did-finish-load', () => {
  //   if (!mainWindow) {
  //     throw new Error('"mainWindow" is not defined');
  //   }
  //   // if (process.env.START_MINIMIZED) {
  //   //   mainWindow.minimize();
  //   // } else {
  //   //   mainWindow.show();
  //   //   mainWindow.focus();
  //   // }
  // });

  mainWindow.on('closed', () => {
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
