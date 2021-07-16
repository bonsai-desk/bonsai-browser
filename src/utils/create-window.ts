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
import { clamp, moveTowards } from './utils';

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
    const distanceScaled = Math.min(
      distance / (display.workAreaSize.width / 3),
      1
    );
    const distanceScaledOpposite = 1 - distanceScaled;
    const moveTowardsThreshold = display.workAreaSize.height * 0.01; // 0.02
    const moveTowardsSpeedThreshold = 100;
    const windowSpeed = glMatrix.vec2.len(wm.windowVelocity);
    if (
      distance < moveTowardsThreshold &&
      windowSpeed < moveTowardsSpeedThreshold
    ) {
      wm.windowVelocity[0] = 0;
      wm.windowVelocity[1] = 0;

      // if (distance > 1) {
      //   console.log(`move towards at speed: ${moveTowardsSpeed}`);
      //   wm.windowPosition[0] = moveTowards(
      //     wm.windowPosition[0],
      //     wm.targetWindowPosition[0],
      //     deltaTime * moveTowardsSpeed
      //   );
      //   wm.windowPosition[1] = moveTowards(
      //     wm.windowPosition[1],
      //     wm.targetWindowPosition[1],
      //     deltaTime * moveTowardsSpeed
      //   );
      // }
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
      const drag = Math.max(
        10 *
          (distanceScaledOpposite *
            distanceScaledOpposite *
            distanceScaledOpposite),
        1
      );
      let xDrag = drag;
      let yDrag = drag;

      // force to keep inside screen
      const springConstant = 50;
      const minEdgeDrag = 2;
      if (up < padding) {
        const dist = -(wm.windowPosition[1] - padding);
        wm.windowVelocity[1] += deltaTime * springConstant * dist;
        if (wm.windowVelocity[1] > 0) {
          const edgeDrag = clamp(
            (dist / display.workAreaSize.height) * wm.windowVelocity[1],
            minEdgeDrag,
            10
          );
          yDrag = Math.max(yDrag, edgeDrag);
        }
      }
      if (down < padding) {
        const bottomY = wm.windowPosition[1] + wm.windowSize.height;
        const dist = -(display.workAreaSize.height - bottomY - padding);
        wm.windowVelocity[1] += deltaTime * springConstant * -dist;
        if (wm.windowVelocity[1] < 0) {
          const edgeDrag = clamp(
            (dist / display.workAreaSize.height) * -wm.windowVelocity[1],
            minEdgeDrag,
            10
          );
          yDrag = Math.max(yDrag, edgeDrag);
        }
      }
      if (left < padding) {
        const dist = -(wm.windowPosition[0] - padding);
        wm.windowVelocity[0] += deltaTime * springConstant * dist;
        if (wm.windowVelocity[0] > 0) {
          const edgeDrag = clamp(
            (dist / display.workAreaSize.height) * wm.windowVelocity[0],
            minEdgeDrag,
            10
          );
          xDrag = Math.max(xDrag, edgeDrag);
        }
      }
      if (right < padding) {
        const rightX = wm.windowPosition[0] + wm.windowSize.width;
        const dist = -(display.workAreaSize.width - rightX - padding);
        wm.windowVelocity[0] += deltaTime * springConstant * -dist;
        if (wm.windowVelocity[0] < 0) {
          const edgeDrag = clamp(
            (dist / display.workAreaSize.height) * -wm.windowVelocity[0],
            minEdgeDrag,
            10
          );
          xDrag = Math.max(xDrag, edgeDrag);
        }
      }

      wm.windowVelocity[0] *= 1 - deltaTime * xDrag;
      wm.windowVelocity[1] *= 1 - deltaTime * yDrag;

      if (windowSpeed < Math.max(distanceScaled * 3500, 500)) {
        // calculate force to target
        const forceToTarget = glMatrix.vec2.create();
        // let force = Math.max(50000 * (1 - distanceScaled), 0);
        // // force = clamp(force, )
        const force = Math.max(distanceScaled * 2500, 1500);
        glMatrix.vec2.scale(forceToTarget, towardsTarget, deltaTime * force);
        glMatrix.vec2.add(wm.windowVelocity, wm.windowVelocity, forceToTarget);
      }

      // apply velocity
      wm.windowPosition[0] += wm.windowVelocity[0] * deltaTime;
      wm.windowPosition[1] += wm.windowVelocity[1] * deltaTime;

      wm.windowSize.width = floatingWidth;
      wm.windowSize.height = floatingHeight;
      wm.updateMainWindowBounds();
    }
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
