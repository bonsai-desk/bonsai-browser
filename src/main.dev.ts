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
  BrowserView,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  Menu,
  MenuItem,
  screen,
  shell,
} from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import MenuBuilder from './menu';
import { headerHeight } from './tab-view';
import { moveTowards, validURL, windowHasView } from './utils';
import {
  createTray,
  handleFindText,
  installExtensions,
  updateWebContents,
} from './windows';
import { closeFind, createNewTab, setTab } from './listeners';
import WindowManager from './window-manager';

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

const RESOURCES_PATH = app.isPackaged
  ? path.join(process.resourcesPath, 'assets')
  : path.join(__dirname, '../assets');

const getAssetPath = (...paths: string[]): string => {
  return path.join(RESOURCES_PATH, ...paths);
};

const wm = new WindowManager();

function removeTab(
  id: number,
  window: Electron.BrowserWindow,
  findView: Electron.BrowserView,
  urlPeekView: Electron.BrowserView,
  event: Electron.IpcMainEvent,
  windowManager: WindowManager
) {
  const tabView = windowManager.allTabViews[id];
  if (typeof tabView === 'undefined') {
    throw new Error(`remove-tab: tab with id ${id} does not exist`);
  }
  window.removeBrowserView(tabView.view);
  windowManager.activeTabId = -1;
  closeFind(window, findView, windowManager);
  if (windowHasView(window, urlPeekView)) {
    window.removeBrowserView(urlPeekView);
  }
  // eslint-disable-line
  (tabView.view.webContents as any).destroy();
  delete windowManager.allTabViews[id];
  event.reply('tab-removed', id);
}

function loadUrlInTab(
  id: number,
  url: string,
  event: Electron.IpcMainEvent,
  window: Electron.BrowserWindow,
  findView: Electron.BrowserView,
  windowManager: WindowManager
) {
  if (id === -1 || url === '') {
    return;
  }
  const tabView = windowManager.allTabViews[id];
  if (typeof tabView === 'undefined') {
    throw new Error(`load-url-in-active-tab: tab with id ${id} does not exist`);
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
    closeFind(window, findView, windowManager);
    event.reply('url-changed', [id, newUrl]);
    updateWebContents(event, id, tabView);
  })();
}

function tabBack(
  id: number,
  window: Electron.BrowserWindow,
  findView: Electron.BrowserView,
  event: Electron.IpcMainEvent,
  windowManager: WindowManager
) {
  if (windowManager.allTabViews[id].view.webContents.canGoBack()) {
    closeFind(window, findView, windowManager);
    windowManager.allTabViews[id].view.webContents.goBack();
  }
  updateWebContents(event, id, windowManager.allTabViews[id]);
}

function tabForward(
  id: number,
  window: Electron.BrowserWindow,
  findView: Electron.BrowserView,
  event: Electron.IpcMainEvent,
  windowManager: WindowManager
) {
  if (windowManager.allTabViews[id].view.webContents.canGoForward()) {
    closeFind(window, findView, windowManager);
    windowManager.allTabViews[id].view.webContents.goForward();
  }
  updateWebContents(event, id, windowManager.allTabViews[id]);
}

function tabRefresh(
  window: Electron.BrowserWindow,
  findView: Electron.BrowserView,
  id: number,
  windowManager: WindowManager
) {
  closeFind(window, findView, windowManager);
  windowManager.allTabViews[id].view.webContents.reload();
}

function findTextChange(boxText: string, windowManager: WindowManager) {
  windowManager.findText = boxText;
  const tabView = windowManager.allTabViews[windowManager.activeTabId];
  if (typeof tabView !== 'undefined') {
    windowManager.lastFindTextSearch = handleFindText(
      tabView.view,
      windowManager.findText,
      windowManager.lastFindTextSearch
    );
  }
}

function findPrevious(windowManager: WindowManager) {
  const tabView = windowManager.allTabViews[windowManager.activeTabId];
  if (typeof tabView !== 'undefined') {
    windowManager.lastFindTextSearch = handleFindText(
      tabView.view,
      windowManager.findText,
      windowManager.lastFindTextSearch,
      true
    );
  }
}

function findNext(windowManager: WindowManager) {
  const tabView = windowManager.allTabViews[windowManager.activeTabId];
  if (typeof tabView !== 'undefined') {
    windowManager.lastFindTextSearch = handleFindText(
      tabView.view,
      windowManager.findText,
      windowManager.lastFindTextSearch
    );
  }
}

function windowMoving(
  mouseX: number,
  mouseY: number,
  windowManager: WindowManager
) {
  const { x, y } = screen.getCursorScreenPoint();
  mainWindow?.setPosition(x - mouseX, y - mouseY);
  windowManager.movingWindow = true;
}

function windowMoved(windowManager: WindowManager) {
  windowManager.movingWindow = false;
}

function addListeners(
  window: BrowserWindow,
  titleBarView: BrowserView,
  urlPeekView: BrowserView,
  findView: BrowserView,
  browserPadding: number
) {
  ipcMain.on('create-new-tab', (_, id) => {
    createNewTab(
      window,
      id,
      titleBarView,
      urlPeekView,
      findView,
      browserPadding,
      wm
    );
  });
  ipcMain.on('remove-tab', (event, id) => {
    removeTab(id, window, findView, urlPeekView, event, wm);
  });
  ipcMain.on('set-tab', (_, [id, oldId]) => {
    setTab(window, titleBarView, urlPeekView, findView, id, oldId, wm);
  });
  ipcMain.on('load-url-in-tab', (event, [id, url]) => {
    loadUrlInTab(id, url, event, window, findView, wm);
  });
  ipcMain.on('tab-back', (event, id) => {
    tabBack(id, window, findView, event, wm);
  });
  ipcMain.on('tab-forward', (event, id) => {
    tabForward(id, window, findView, event, wm);
  });
  ipcMain.on('tab-refresh', (_, id) => {
    tabRefresh(window, findView, id, wm);
  });
  ipcMain.on('close-find', () => {
    closeFind(window, findView, wm);
  });
  ipcMain.on('find-text-change', (_, boxText) => {
    findTextChange(boxText, wm);
  });
  ipcMain.on('find-previous', () => {
    findPrevious(wm);
  });
  ipcMain.on('find-next', () => {
    findNext(wm);
  });
  ipcMain.on('windowMoving', (_, { mouseX, mouseY }) => {
    windowMoving(mouseX, mouseY, wm);
  });
  ipcMain.on('windowMoved', () => {
    windowMoved(wm);
  });
}

const createWindow = async () => {
  if (
    process.env.NODE_ENV === 'development' ||
    process.env.DEBUG_PROD === 'true'
  ) {
    await installExtensions();
  }

  let browserPadding = 35.0;
  const displays = screen.getAllDisplays();
  if (displays.length === 0) {
    throw new Error('No displays!');
  }
  const display = displays[0];
  if (displays.length > 0) {
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

  let windowFloating = false;

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

  const overlayView = new BrowserView({
    webPreferences: {
      nodeIntegration: true,
    },
  });

  overlayView.webContents.loadURL(`file://${__dirname}/overlay.html`);

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
      const padding = windowFloating ? 0 : browserPadding;
      const hh = windowFloating ? 0 : headerHeight;
      const windowSize = mainWindow.getSize();
      titleBarView.setBounds({
        x: padding,
        y: padding,
        width: windowSize[0] - padding * 2,
        height: hh,
      });
      urlPeekView.setBounds({
        x: padding,
        y: windowSize[1] - urlPeekHeight - padding,
        width: urlPeekWidth,
        height: urlPeekHeight,
      });
      findView.setBounds({
        x: windowSize[0] - findViewWidth - findViewMarginRight - padding,
        y: hh + padding,
        width: findViewWidth,
        height: findViewHeight,
      });
      overlayView.setBounds({
        x: 0,
        y: 0,
        width: windowSize[0],
        height: windowSize[1],
      });
    }
  };

  resize();
  mainWindow.on('resize', resize);

  let startTime: number | null = null;
  let lastTime = 0;
  setInterval(() => {
    const currentTime = new Date().getTime() / 1000.0;
    if (startTime === null) {
      startTime = currentTime;
    }
    const time = currentTime - startTime;
    const deltaTime = time - lastTime;
    lastTime = time;

    if (windowFloating && !wm.movingWindow && mainWindow !== null) {
      const padding = 25;
      const speed = 3000;

      const bounds = mainWindow.getBounds();
      const up = bounds.y;
      const down = display.workAreaSize.height - (bounds.y + bounds.height);
      const left = bounds.x;
      const right = display.workAreaSize.width - (bounds.x + bounds.width);

      const xTarget =
        left < right
          ? padding
          : display.workAreaSize.width - bounds.width - padding;

      const yTarget =
        up < down
          ? padding
          : display.workAreaSize.height - bounds.height - padding;

      bounds.x = Math.floor(moveTowards(bounds.x, xTarget, deltaTime * speed));
      bounds.y = Math.floor(moveTowards(bounds.y, yTarget, deltaTime * speed));

      mainWindow.setBounds(bounds);
    }
  }, 1);

  const tray = createTray(getAssetPath('icon.png'), mainWindow);

  mainWindow?.setResizable(false);

  globalShortcut.register('CmdOrCtrl+\\', () => {
    if (mainWindow?.isVisible()) {
      mainWindow?.hide();
    } else {
      mainWindow?.show();
    }
  });

  app.on('before-quit', () => {
    tray.destroy();
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

            const tabView = wm.allTabViews[wm.activeTabId];
            if (typeof tabView !== 'undefined') {
              findView.webContents.focus();
              findView.webContents.send('open-find');
              handleFindText(tabView.view, wm.findText, wm.lastFindTextSearch);
            }
          },
        },
        {
          label: 'stop-find',
          accelerator: 'Escape',
          click: () => {
            if (mainWindow !== null) {
              closeFind(mainWindow, findView, wm);
            }
          },
        },
        {
          label: 'Float',
          accelerator: 'CmdOrCtrl+M',
          click: () => {
            if (mainWindow?.isVisible()) {
              windowFloating = !windowFloating;
              const { width, height } = display.workAreaSize;

              if (windowFloating) {
                // snap to corner mode
                if (!windowHasView(mainWindow, overlayView)) {
                  mainWindow?.addBrowserView(overlayView);
                  mainWindow?.setTopBrowserView(overlayView);
                }
                if (windowHasView(mainWindow, titleBarView)) {
                  mainWindow?.removeBrowserView(titleBarView);
                }
                mainWindow?.setBounds({
                  x: 100,
                  y: 100,
                  width: 500,
                  height: 500,
                });
                mainWindow?.setAlwaysOnTop(true);
              } else {
                mainWindow?.setBounds({
                  x: 0,
                  y: 0,
                  width,
                  height,
                });

                // black border mode
                mainWindow?.setAlwaysOnTop(true);
                if (windowHasView(mainWindow, overlayView)) {
                  mainWindow?.removeBrowserView(overlayView);
                }
                if (!windowHasView(mainWindow, titleBarView)) {
                  mainWindow?.addBrowserView(titleBarView);
                  mainWindow?.setTopBrowserView(titleBarView);
                }
              }

              Object.values(wm.allTabViews).forEach((tabView) => {
                tabView.windowFloating = windowFloating;
                tabView.resize();
              });

              resize();
            }
          },
        },
      ],
    })
  );

  // Menu.buildFromTemplate(menuItems).popup();
  Menu.setApplicationMenu(menu);
};

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
