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
import { moveTowards } from './utils';
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

  mainWindow.webContents.on('did-finish-load', () => {
    wm.mainWindow.webContents.send('set-padding', wm.browserPadding.toString());
  });

  wm.windowPosition.x = 0;
  wm.windowPosition.y = 0;
  wm.windowSize.width = display.workAreaSize.width - 1; // todo: without the -1, everything breaks!!??!?
  wm.windowSize.height = display.workAreaSize.height - 1;
  wm.updateMainWindowBounds();

  // open window before loading is complete
  mainWindow.show();
  mainWindow.focus();

  addListeners(wm, wm.browserPadding);

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

    if (!(wm.windowFloating && !wm.movingWindow && mainWindow !== null)) {
      return;
    }

    const padding = 25;
    const speed = 3000;

    if (
      Math.round(wm.windowPosition.x) ===
        Math.round(display.workAreaSize.width / 2.0 - floatingWidth / 2.0) &&
      Math.round(wm.windowPosition.y) ===
        Math.round(display.workAreaSize.height / 2.0 - floatingHeight / 2.0)
    ) {
      return;
    }

    const up = wm.windowPosition.y;
    const down =
      display.workAreaSize.height -
      (wm.windowPosition.y + wm.windowSize.height);
    const left = wm.windowPosition.x;
    const right =
      display.workAreaSize.width - (wm.windowPosition.x + wm.windowSize.width);

    const xTarget =
      left < right
        ? padding
        : display.workAreaSize.width - wm.windowSize.width - padding;

    const yTarget =
      up < down
        ? padding
        : display.workAreaSize.height - wm.windowSize.height - padding;

    // wm.windowPosition.x += wm.windowVelocity.x * deltaTime;
    // wm.windowPosition.y += wm.windowVelocity.y * deltaTime;
    wm.windowPosition.x = moveTowards(
      wm.windowPosition.x,
      xTarget,
      deltaTime * speed
    );
    wm.windowPosition.y = moveTowards(
      wm.windowPosition.y,
      yTarget,
      deltaTime * speed
    );
    wm.windowSize.width = floatingWidth;
    wm.windowSize.height = floatingHeight;
    wm.updateMainWindowBounds();
  }, 1);

  const tray = createTray(ICON_PNG, mainWindow);

  mainWindow?.setResizable(false);

  globalShortcut.register('CmdOrCtrl+\\', () => {
    const activeTabView = wm.allTabViews[wm.activeTabId];
    if (!mainWindow?.isVisible()) {
      if (
        activeTabView !== null &&
        typeof activeTabView !== 'undefined' &&
        activeTabView.view.webContents.getURL() === ''
      ) {
        wm.removeTab(wm.activeTabId);
      }
      mainWindow?.show();
      wm.unFloat(display);
      mainWindow?.focus();
      wm.titleBarView.webContents.focus();
      wm.titleBarView.webContents.send('create-new-tab');
    } else if (
      !wm.windowFloating &&
      activeTabView !== null &&
      typeof activeTabView !== 'undefined' &&
      activeTabView.view.webContents.getURL() !== ''
    ) {
      wm.float(display, floatingWidth, floatingHeight);
    } else {
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
            wm.clickFind();
          },
        },
        {
          label: 'stop-find',
          accelerator: 'Escape',
          click: () => {
            wm.closeFind();
          },
        },
        {
          label: 'Float',
          accelerator: 'CmdOrCtrl+M',
          click: () => {
            // wm.toggleFloat(display, floatingWidth, floatingHeight);
            // wm.allTabViews[wm.activeTabId].view.webContents.executeJavaScript(`
            //   window.scrollBy(0, 100);
            // `);
          },
        },
      ],
    })
  );

  Menu.setApplicationMenu(menu);
};
