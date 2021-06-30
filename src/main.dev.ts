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
import { app, BrowserWindow, BrowserView, shell, ipcMain } from 'electron';
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

function addListeners(window: BrowserWindow) {
  ipcMain.on('asynchronous-message', (event, arg) => {
    window.webContents.loadURL('https://arxiv.org/abs/2106.12583'); // loads to main window which is hidden
    console.log('message', arg);
    event.reply('asynchronous-reply', 'pong');
  });
  ipcMain.on('create-new-tab', (event, [url, id]) => {
    const tabView = new TabView(window, url);
    tabViews[id] = tabView;
    event.reply('new-tab-created', [url, id, 'test']);
  });
  ipcMain.on('remove-tab', (event, id) => {
    window.removeBrowserView(tabViews[id].view);
    delete tabViews[id];
    event.reply('tab-removed', id);
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

  if (process.platform === 'darwin') {
    mainWindow = new BrowserWindow({
      frame: false,
      titleBarStyle: 'hidden',
      width: startWindowWidth,
      height: startWindowHeight,
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
      icon: getAssetPath('icon.png'),
      webPreferences: {
        nodeIntegration: true,
      },
    });
  }

  addListeners(mainWindow);

  // open window before loading is complete
  if (process.env.START_MINIMIZED) {
    mainWindow.minimize();
  } else {
    mainWindow.show();
    mainWindow.focus();
  }

  const titleBarView = new BrowserView({
    webPreferences: {
      nodeIntegration: true,
    },
  });
  mainWindow.setBrowserView(titleBarView);
  titleBarView.setBounds({
    x: 0,
    y: 0,
    width: startWindowWidth,
    height: headerHeight,
  });
  titleBarView.webContents.loadURL(`file://${__dirname}/index.html`);

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

  // titleBarView.webContents.toggleDevTools();
  titleBarView.webContents.openDevTools({
    mode: 'detach',
  });

  // const tabView = new TabView(mainWindow);

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
