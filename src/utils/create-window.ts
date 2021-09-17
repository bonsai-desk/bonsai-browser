/* eslint no-console: off */
import {
  app,
  BrowserWindow,
  globalShortcut,
  Menu,
  MenuItem,
  MenuItemConstructorOptions,
  Tray,
} from 'electron';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import { setInterval } from 'timers';
import WindowManager from './window-manager';
import {
  ICON_PNG,
  ICON_SMALL_PNG,
  ONBOARDING_HTML,
  VIBRANCY,
} from '../constants';
import windowFixedUpdate from './calculate-window-physics';
import { windowHasView } from './utils';
import { floatingSize, makeWebContentsSafe } from './wm-utils';
import MixpanelManager from './mixpanel-manager';
import SaveData from './SaveData';

function updateIfNeeded() {
  // eslint-disable-next-line global-require
  log.transports.file.level = 'info';
  autoUpdater.logger = log;
  autoUpdater.checkForUpdatesAndNotify();
}

// function initUpdater() {
//   // Remove this if your app does not use auto updates
//   // eslint-disable-next-line
//   new AppUpdater();
// }

function initMenu(wm: WindowManager) {
  const edit: MenuItemConstructorOptions = {
    label: 'Edit',
    submenu: [
      {
        label: 'Undo',
        accelerator: 'CmdOrCtrl+Z',
        role: 'undo',
      },
      {
        label: 'Redo',
        accelerator: 'Shift+CmdOrCtrl+Z',
        role: 'redo',
      },
      {
        type: 'separator',
      },
      {
        label: 'Cut',
        accelerator: 'CmdOrCtrl+X',
        role: 'cut',
      },
      {
        label: 'Copy',
        accelerator: 'CmdOrCtrl+C',
        role: 'copy',
      },
      {
        label: 'Paste',
        accelerator: 'CmdOrCtrl+V',
        role: 'paste',
      },
      {
        label: 'Select All',
        accelerator: 'CmdOrCtrl+A',
        role: 'selectAll',
      },
    ],
  };
  const main: MenuItem = new MenuItem({
    label: 'Main',
    submenu: [
      {
        label: 'Find',
        accelerator: 'CmdOrCtrl+F',
        click: () => {
          if (windowHasView(wm.mainWindow, wm.titleBarView)) {
            wm.clickFind();
          }
        },
      },
      {
        label: 'Toggle Float Window',
        accelerator: 'CmdOrCtrl+\\',
        click: () => {
          if (wm.activeTabId === -1) {
            return;
          }

          if (wm.windowFloating) {
            wm.unFloat();
          } else {
            wm.float();
          }
        },
      },
      {
        label: 'Close current tab',
        accelerator: 'CmdOrCtrl+W',
        click: () => {
          if (wm.activeTabId === -1) {
            return;
          }

          wm.removeTabs([wm.activeTabId]);
        },
      },
      {
        label: 'Back to home',
        accelerator: 'CmdOrCtrl+B',
        click: () => {
          if (wm.activeTabId === -1) {
            return;
          }

          if (wm.webBrowserViewActive()) {
            wm.unSetTab();
          }
        },
      },
      {
        label: 'Select Search',
        accelerator: 'CmdOrCtrl+L',
        click: () => {
          wm.focusMainSearch();
        },
      },
      {
        label: 'History',
        accelerator: 'CmdOrCtrl+H',
        click: () => {
          if (windowHasView(wm.mainWindow, wm.tabPageView)) {
            if (wm.webBrowserViewActive()) {
              wm.unSetTab();
            }
            wm.tabPageView.webContents.send('toggle-history-modal');
          }
        },
      },
      {
        label: 'Debug',
        accelerator: 'CmdOrCtrl+D',
        click: () => {
          if (windowHasView(wm.mainWindow, wm.tabPageView)) {
            if (wm.webBrowserViewActive()) {
              wm.unSetTab();
            }
            wm.tabPageView.webContents.send('toggle-debug-modal');
          }
        },
      },
      {
        label: 'Undo Removed Tabs',
        accelerator: 'CmdOrCtrl+Shift+T',
        click: () => {
          if (windowHasView(wm.mainWindow, wm.tabPageView)) {
            wm.undoRemovedTabs();
          }
        },
      },
      {
        label: 'Quit',
        accelerator: 'Cmd+Q',
        click: () => {
          wm.tabPageView.webContents.send('save-snapshot');
          wm.saveHistory();
          setTimeout(() => {
            wm.mainWindow?.destroy();
            app.quit();
          }, 100);
        },
      },
    ],
  });
  const template = [main, edit];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function initFixedUpdate(wm: WindowManager) {
  const fixedTimeStep = 0.01;
  let lastFixedUpdateTime = 0;
  const fixedUpdate = () => {
    const deltaTime = fixedTimeStep;
    const [floatingWidth, floatingHeight] = floatingSize(wm.display);
    windowFixedUpdate(wm, deltaTime, floatingWidth, floatingHeight);
  };

  let startTime: number | null = null;

  const update = () => {
    const currentTime = Date.now() / 1000.0;
    if (startTime === null) {
      startTime = currentTime;
    }
    const time = currentTime - startTime;

    while (lastFixedUpdateTime < time) {
      lastFixedUpdateTime += fixedTimeStep;
      fixedUpdate();
    }
  };
  setInterval(update, 1);
}

let onboardingWindowReady = false;
let mainWindowReady = false;

function showOnboardingWindow(onboardingWindow: BrowserWindow | null) {
  onboardingWindow?.show();
  onboardingWindow?.focus();
  onboardingWindow?.webContents.focus();
}

function initBoot(wm: WindowManager, onboardingWindow: BrowserWindow | null) {
  let booted = false;
  const boot = () => {
    if (!booted) {
      booted = true;
      mainWindowReady = true;
      if (onboardingWindowReady) {
        showOnboardingWindow(onboardingWindow);
      }
      if (!wm.saveData.data.finishedOnboarding) {
        return;
      }
      wm.showWindow();
    }
  };
  wm.tabPageView.webContents.on('did-finish-load', boot);
  setTimeout(boot, 5000);
}

function initWindow(): BrowserWindow {
  app.on('web-contents-created', (_, contents) => {
    contents.on('will-attach-webview', (event, webPreferences) => {
      // Strip away preload scripts if unused or verify their location is legitimate
      delete webPreferences.preload;

      // Disable Node.js integration
      webPreferences.nodeIntegration = false;

      event.preventDefault();
    });
  });

  const mac = process.platform === 'darwin';
  const mainWindow: BrowserWindow = new BrowserWindow({
    frame: false,
    transparent: true,
    resizable: false,
    width: 600,
    height: 300,
    minWidth: 50,
    minHeight: 50,
    show: false,
    icon: ICON_SMALL_PNG,
    vibrancy: mac ? VIBRANCY : undefined, // menu, popover, hud, fullscreen-ui
    roundedCorners: false,
    visualEffectState: mac ? 'active' : undefined,
    // fullscreen: true,
    // simpleFullscreen: true,
    webPreferences: {
      nodeIntegration: false,
      devTools: false,
      contextIsolation: true,
    },
  });
  makeWebContentsSafe(mainWindow.webContents);
  mainWindow.setAlwaysOnTop(true, 'status');
  return mainWindow;
}

function initOnboardingWindow(): BrowserWindow {
  const onboardingWindow: BrowserWindow = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 800,
    minHeight: 600,
    maxWidth: 800,
    maxHeight: 600,
    show: false,
    icon: ICON_SMALL_PNG,
    fullscreen: false,
    webPreferences: {
      nodeIntegration: true,
      devTools: false,
      contextIsolation: false,
    },
  });
  makeWebContentsSafe(onboardingWindow.webContents);
  onboardingWindow.webContents.loadURL(ONBOARDING_HTML);
  onboardingWindow.webContents.on('did-finish-load', () => {
    onboardingWindowReady = true;
    if (mainWindowReady) {
      showOnboardingWindow(onboardingWindow);
    }
  });
  return onboardingWindow;
}

function initShortcuts(wm: WindowManager) {
  let shortCut = 'Alt+Space';
  if (process.env.NODE_ENV === 'development') {
    shortCut = 'Ctrl+Alt+Space';
  }
  globalShortcut.register(shortCut, () => {
    if (!wm.saveData.data.finishedOnboarding) {
      wm.saveData.data.finishedOnboarding = true;
      wm.saveData.save();
      wm.onboardingWindow?.destroy();
      wm.onboardingWindow = null;
    }
    if (!wm.mainWindow?.isVisible()) {
      wm.mixpanelManager.track('show with global shortcut');
      wm.showWindow();
    } else {
      wm.mixpanelManager.track('hide with global shortcut');
      wm.hideWindow();
    }
  });
}

function initApp(wm: WindowManager) {
  app.on('window-all-closed', () => {
    // Respect the OSX convention of having the application in memory even
    // after all windows have been closed
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  if (process.platform === 'darwin') {
    app.dock.setIcon(ICON_PNG);
  }

  app.on('activate', () => {
    if (wm.saveData.data.finishedOnboarding) {
      wm.showWindow();
    } else if (wm.onboardingWindow && !wm.onboardingWindow.isDestroyed()) {
      wm.onboardingWindow.show();
    } else {
      wm.onboardingWindow = initOnboardingWindow();
    }
  });

  app.on('before-quit', () => {
    wm.mainWindow?.destroy();
  });
}

export function initTray(appIconPath: string, wm: WindowManager): Tray {
  const appIcon = new Tray(appIconPath);
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Alt+Space to open',
      click() {
        // do nothing. this is just to show the shortcut
      },
    },
    {
      label: 'Exit',
      click() {
        wm.tabPageView.webContents.send('save-snapshot');
        wm.saveHistory();
        setTimeout(() => {
          wm.mainWindow?.destroy();
          app.quit();
        }, 100);
      },
    },
  ]);

  appIcon.on('double-click', () => {
    wm.mainWindow?.show();
  });
  appIcon.setToolTip('Bonsai Browser');
  appIcon.setContextMenu(contextMenu);

  // todo
  // mainWindow.on('closed', () => {
  //   appIcon.destroy();
  //   mainWindow = null;
  // });

  return appIcon;
}

const installer = require('electron-devtools-installer');

const installExtensions = async () => {
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload
    )
    .catch(console.log);
};

export const createWindow = async () => {
  if (
    process.env.NODE_ENV === 'development' ||
    process.env.DEBUG_PROD === 'true'
  ) {
    await installExtensions();
  }

  let userId = '';
  const idPath = path.join(app.getPath('userData'), 'da');
  try {
    console.log('Loading user id');
    userId = fs.readFileSync(idPath, 'utf8');
  } catch {
    console.log('could not load user id');
  }

  if (userId === '') {
    try {
      console.log('creating new id');
      userId = uuidv4();
      fs.writeFileSync(idPath, userId);
    } catch {
      console.log('could not save id');
    }
  }

  console.log(`User Id: ${userId}`);

  const mixpanelManager = new MixpanelManager(userId);

  const saveData = new SaveData();
  const onboardingWindow = saveData.data.finishedOnboarding
    ? null
    : initOnboardingWindow();

  const wm = new WindowManager(
    initWindow(),
    mixpanelManager,
    saveData,
    onboardingWindow
  );

  initBoot(wm, onboardingWindow);

  initFixedUpdate(wm);

  initShortcuts(wm);

  initMenu(wm);

  initApp(wm);

  if (app.isPackaged) {
    updateIfNeeded();
    setInterval(updateIfNeeded, 1000 * 60 * 60);
  }
};
