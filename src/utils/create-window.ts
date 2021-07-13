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

  mainWindow.webContents.loadURL(MAIN_HTML);

  const wm = new WindowManager(mainWindow);

  const displays = screen.getAllDisplays();
  if (displays.length === 0) {
    throw new Error('No displays!');
  }
  const display = displays[0];
  if (displays.length > 0) {
    wm.browserPadding = Math.floor(display.workAreaSize.height / 15.0);
  }

  // open window before loading is complete
  if (process.env.START_MINIMIZED) {
    mainWindow.minimize();
  } else {
    mainWindow.show();
    mainWindow.focus();
  }

  addListeners(wm, wm.browserPadding);

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

  wm.resize();

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

    if (wm.windowFloating && !wm.movingWindow && mainWindow !== null) {
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
            wm.float(display);
          },
        },
      ],
    })
  );

  Menu.setApplicationMenu(menu);
};
