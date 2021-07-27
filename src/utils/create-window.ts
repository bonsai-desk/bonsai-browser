/* eslint no-console: off */
import {
  app,
  BrowserWindow,
  globalShortcut,
  Menu,
  MenuItem,
  screen,
} from 'electron';
import log from 'electron-log';
import { autoUpdater } from 'electron-updater';
import { createTray, installExtensions } from './windows';
import addListeners from './listeners';
import WindowManager from './window-manager';
import { ICON_PNG, MAIN_HTML } from '../constants';
import windowFixedUpdate from './calculate-window-physics';
import { windowHasView } from './utils';

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

  let mainWindow: BrowserWindow | null = new BrowserWindow({
    frame: false,
    transparent: true,
    width: 300,
    height: 300,
    minWidth: 50,
    minHeight: 50,
    icon: ICON_PNG,
    webPreferences: {
      nodeIntegration: true,
      devTools: false,
      contextIsolation: false, // todo: do we need this? security concern?
    },
  });

  mainWindow.setAlwaysOnTop(true);

  mainWindow.webContents.loadURL(MAIN_HTML);

  const displays = screen.getAllDisplays();
  if (displays.length === 0) {
    throw new Error('No displays!');
  }
  const display = displays[0];

  const wm = new WindowManager(mainWindow, display);
  wm.browserPadding = Math.floor(display.workAreaSize.height / 15.0);

  wm.mainWindow.on('close', () => {
    wm.saveHistory();
  });

  mainWindow.webContents.on('did-finish-load', () => {
    wm.mainWindow.webContents.send('set-padding', wm.browserPadding.toString());
    mainWindow?.show();
  });

  wm.windowPosition[0] = 0;
  wm.windowPosition[1] = 0;
  wm.windowSize.width = display.workAreaSize.width;
  wm.windowSize.height = display.workAreaSize.height - 1; // todo: without the -1, everything breaks!!??!?
  wm.updateMainWindowBounds();

  // open window before loading is complete
  // mainWindow.show();
  // mainWindow.focus();
  mainWindow.hide();

  addListeners(wm);

  mainWindow.on('minimize', (e: Event) => {
    if (mainWindow !== null) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  wm.resize();

  const height80 = display.workAreaSize.height * 0.7;
  const floatingWidth = Math.floor(height80 * 0.7);
  const floatingHeight = Math.floor(height80);

  const fixedTimeStep = 0.01;
  let lastFixedUpdateTime = 0;
  const fixedUpdate = () => {
    const deltaTime = fixedTimeStep;
    windowFixedUpdate(deltaTime, wm, floatingWidth, floatingHeight);
  };

  let startTime: number | null = null;
  // let lastTime = 0;

  const update = () => {
    const currentTime = new Date().getTime() / 1000.0;
    if (startTime === null) {
      startTime = currentTime;
    }
    const time = currentTime - startTime;
    // const deltaTime = time - lastTime;
    // lastTime = time;

    while (lastFixedUpdateTime < time) {
      lastFixedUpdateTime += fixedTimeStep;
      fixedUpdate();
    }
  };

  setInterval(update, 1);

  const tray = createTray(ICON_PNG, mainWindow);

  mainWindow?.setResizable(false);

  const shortCut = app.isPackaged ? 'Alt+Space' : 'CmdOrCtrl+\\';
  globalShortcut.register(shortCut, () => {
    const activeTabView = wm.allTabViews[wm.activeTabId];
    if (!mainWindow?.isVisible()) {
      // if (
      //   activeTabView !== null &&
      //   typeof activeTabView !== 'undefined' &&
      //   activeTabView.view.webContents.getURL() === ''
      // ) {
      //   wm.removeTab(wm.activeTabId);
      // }
      wm.mainWindow.show();
      wm.unFloat(display);
      mainWindow?.focus();
      wm.setTab(-1);
      // wm.titleBarView.webContents.focus();
      // wm.createNewTab();
    } else if (
      !wm.windowFloating &&
      activeTabView !== null &&
      typeof activeTabView !== 'undefined' &&
      activeTabView.view.webContents.getURL() !== ''
    ) {
      wm.float(display, floatingWidth, floatingHeight);
    } else {
      wm.unFloat(display);
      wm.setTab(-1);
      mainWindow?.hide();
    }
  });

  app.on('before-quit', () => {
    tray.destroy();
  });

  mainWindow.on('closed', () => {
    tray.destroy();
    mainWindow = null;
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
            if (windowHasView(wm.mainWindow, wm.titleBarView)) {
              wm.clickFind();
            }
          },
        },
        {
          label: 'escape',
          accelerator: 'Escape',
          click: () => {
            if (wm.windowFloating) {
              mainWindow?.hide();
            } else if (windowHasView(wm.mainWindow, wm.tabPageView)) {
              if (wm.historyModalActive) {
                wm.tabPageView.webContents.send('close-history-modal');
              } else {
                mainWindow?.hide();
              }
            } else if (windowHasView(wm.mainWindow, wm.titleBarView)) {
              if (windowHasView(wm.mainWindow, wm.findView)) {
                wm.closeFind();
              } else {
                wm.setTab(-1);
              }
            }
          },
        },
        {
          label: 'history',
          accelerator: 'CmdOrCtrl+H',
          click: () => {
            if (windowHasView(wm.mainWindow, wm.tabPageView)) {
              wm.tabPageView.webContents.send('toggle-history-modal');
            }
          },
        },
        {
          label: 'undo removed tabs',
          accelerator: 'CmdOrCtrl+Shift+T',
          click: () => {
            if (windowHasView(wm.mainWindow, wm.tabPageView)) {
              wm.undoRemovedTabs();
            }
          },
        },
      ],
    })
  );

  Menu.setApplicationMenu(menu);
};
