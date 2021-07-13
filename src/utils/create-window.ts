/* eslint no-console: off */
import {
  app,
  BrowserWindow,
  globalShortcut,
  Menu,
  MenuItem,
  screen,
  shell,
} from 'electron';
import log from 'electron-log';
import { autoUpdater } from 'electron-updater';
import { createTray, handleFindText, installExtensions } from './windows';
import { addListeners, closeFind } from './listeners';
import { headerHeight } from './tab-view';
import { moveTowards, windowHasView } from './utils';
import WindowManager from './window-manager';
import { ICON_PNG, MAIN_HTML } from '../constants';

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

// eslint-disable-next-line import/prefer-default-export
export const createWindow = async () => {
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

  let mainWindow: BrowserWindow | null = new BrowserWindow({
    frame: false,
    transparent: true,
    width: 1000,
    height: 1000,
    minWidth: 500,
    minHeight: 500,
    titleBarStyle: 'hidden',
    icon: ICON_PNG,
    webPreferences: {
      nodeIntegration: true,
      devTools: false,
    },
  });

  console.log(mainWindow);

  mainWindow.webContents.loadURL(MAIN_HTML);

  const wm = new WindowManager(mainWindow);

  let windowFloating = false;

  // open window before loading is complete
  if (process.env.START_MINIMIZED) {
    mainWindow.minimize();
  } else {
    mainWindow.show();
    mainWindow.focus();
  }

  const urlPeekWidth = 475;
  const urlPeekHeight = 20;

  const findViewWidth = 350;
  const findViewHeight = 50;
  const findViewMarginRight = 20;

  addListeners(
    wm,
    wm.titleBarView,
    wm.urlPeekView,
    wm.findView,
    browserPadding
  );

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
      wm.titleBarView.setBounds({
        x: padding,
        y: padding,
        width: windowSize[0] - padding * 2,
        height: hh,
      });
      wm.urlPeekView.setBounds({
        x: padding,
        y: windowSize[1] - urlPeekHeight - padding,
        width: urlPeekWidth,
        height: urlPeekHeight,
      });
      wm.findView.setBounds({
        x: windowSize[0] - findViewWidth - findViewMarginRight - padding,
        y: hh + padding,
        width: findViewWidth,
        height: findViewHeight,
      });
      wm.overlayView.setBounds({
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
  // todo can this run at 60fps instead of every millisecond
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

  const tray = createTray(ICON_PNG, mainWindow);

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
            if (
              wm.mainWindow !== null &&
              !windowHasView(wm.mainWindow, wm.findView)
            ) {
              wm.mainWindow.addBrowserView(wm.findView);
              wm.mainWindow.setTopBrowserView(wm.findView);
            }

            const tabView = wm.allTabViews[wm.activeTabId];
            if (typeof tabView !== 'undefined') {
              wm.findView.webContents.focus();
              wm.findView.webContents.send('open-find');
              handleFindText(tabView.view, wm.findText, wm.lastFindTextSearch);
            }
          },
        },
        {
          label: 'stop-find',
          accelerator: 'Escape',
          click: () => {
            if (wm.mainWindow !== null) {
              closeFind(wm.findView, wm);
            }
          },
        },
        {
          label: 'Float',
          accelerator: 'CmdOrCtrl+M',
          click: () => {
            if (wm.mainWindow?.isVisible()) {
              windowFloating = !windowFloating;
              const { width, height } = display.workAreaSize;

              if (windowFloating) {
                // snap to corner mode
                if (!windowHasView(wm.mainWindow, wm.overlayView)) {
                  wm.mainWindow?.addBrowserView(wm.overlayView);
                  wm.mainWindow?.setTopBrowserView(wm.overlayView);
                }
                if (windowHasView(wm.mainWindow, wm.titleBarView)) {
                  wm.mainWindow?.removeBrowserView(wm.titleBarView);
                }
                wm.mainWindow?.setBounds({
                  x: 100,
                  y: 100,
                  width: 500,
                  height: 500,
                });
                wm.mainWindow?.setAlwaysOnTop(true);
              } else {
                wm.mainWindow?.setBounds({
                  x: 0,
                  y: 0,
                  width,
                  height,
                });

                // black border mode
                wm.mainWindow?.setAlwaysOnTop(true);
                if (windowHasView(wm.mainWindow, wm.overlayView)) {
                  wm.mainWindow?.removeBrowserView(wm.overlayView);
                }
                if (!windowHasView(wm.mainWindow, wm.titleBarView)) {
                  wm.mainWindow?.addBrowserView(wm.titleBarView);
                  wm.mainWindow?.setTopBrowserView(wm.titleBarView);
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
