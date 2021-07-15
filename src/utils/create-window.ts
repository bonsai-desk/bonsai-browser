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
import { moveTowards } from './utils';

const glMatrix = require('gl-matrix');

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

  wm.windowPosition[0] = 0;
  wm.windowPosition[1] = 0;
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

  const fixedTimeStep = 0.01;
  let lastFixedUpdateTime = 0;
  const fixedUpdate = () => {
    const deltaTime = fixedTimeStep;

    if (!(wm.windowFloating && !wm.movingWindow && mainWindow !== null)) {
      return;
    }

    const padding = 25;

    if (
      Math.round(wm.windowPosition[0]) ===
        Math.round(display.workAreaSize.width / 2.0 - floatingWidth / 2.0) &&
      Math.round(wm.windowPosition[1]) ===
        Math.round(display.workAreaSize.height / 2.0 - floatingHeight / 2.0)
    ) {
      return;
    }

    const up = wm.windowPosition[1];
    const down =
      display.workAreaSize.height -
      (wm.windowPosition[1] + wm.windowSize.height);
    const left = wm.windowPosition[0];
    const right =
      display.workAreaSize.width - (wm.windowPosition[0] + wm.windowSize.width);

    const distance = glMatrix.vec2.distance(
      wm.windowPosition,
      wm.targetWindowPosition
    );
    const moveTowardsThreshold = display.workAreaSize.height * 0.02;
    if (distance < moveTowardsThreshold) {
      wm.windowVelocity[0] = 0;
      wm.windowVelocity[1] = 0;

      const moveTowardsSpeed = 500;
      wm.windowPosition[0] = moveTowards(
        wm.windowPosition[0],
        wm.targetWindowPosition[0],
        deltaTime * moveTowardsSpeed
      );
      wm.windowPosition[1] = moveTowards(
        wm.windowPosition[1],
        wm.targetWindowPosition[1],
        deltaTime * moveTowardsSpeed
      );
    } else {
      // calculate vector pointing towards target position
      const towardsTarget = glMatrix.vec2.create();
      glMatrix.vec2.sub(
        towardsTarget,
        wm.targetWindowPosition,
        wm.windowPosition
      );
      glMatrix.vec2.normalize(towardsTarget, towardsTarget);

      // apply drag
      const distanceScaled = Math.min(
        distance / (display.workAreaSize.width / 3),
        1
      );
      const drag = Math.max(40 * (1 - distanceScaled), 5);
      glMatrix.vec2.scale(
        wm.windowVelocity,
        wm.windowVelocity,
        1 - deltaTime * drag
      );

      // force to keep inside screen
      const springConstant = 75;
      if (up < padding) {
        wm.windowVelocity[1] +=
          deltaTime * springConstant * -(wm.windowPosition[1] - padding);
      }
      if (down < padding) {
        const bottomY = wm.windowPosition[1] + wm.windowSize.height;
        wm.windowVelocity[1] +=
          deltaTime *
          springConstant *
          (display.workAreaSize.height - bottomY - padding);
      }
      if (left < padding) {
        wm.windowVelocity[0] +=
          deltaTime * springConstant * -(wm.windowPosition[0] - padding);
      }
      if (right < padding) {
        const rightX = wm.windowPosition[0] + wm.windowSize.width;
        wm.windowVelocity[0] +=
          deltaTime *
          springConstant *
          (display.workAreaSize.width - rightX - padding);
      }

      // calculate force to target
      const forceToTarget = glMatrix.vec2.create();
      glMatrix.vec2.scale(forceToTarget, towardsTarget, deltaTime * 40000);
      glMatrix.vec2.add(wm.windowVelocity, wm.windowVelocity, forceToTarget);

      // apply velocity
      wm.windowPosition[0] += wm.windowVelocity[0] * deltaTime;
      wm.windowPosition[1] += wm.windowVelocity[1] * deltaTime;
    }

    wm.windowSize.width = floatingWidth;
    wm.windowSize.height = floatingHeight;
    wm.updateMainWindowBounds();
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

  // todo can this run at 60fps instead of every millisecond
  setInterval(update, 1);

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
