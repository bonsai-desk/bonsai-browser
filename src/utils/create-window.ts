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
import WindowManager from './window-manager';
import { ICON_PNG, ICON_SMALL_PNG, VIBRANCY } from '../constants';
import windowFixedUpdate from './calculate-window-physics';
import { windowHasView } from './utils';
import { floatingSize } from './wm-utils';
import MixpanelManager from './mixpanel-manager';

// class AppUpdater {
//   constructor() {
//     log.transports.file.level = 'info';
//     autoUpdater.logger = log;
//     autoUpdater.checkForUpdatesAndNotify();
//   }
// }

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
        label: 'Select Search',
        accelerator: 'CmdOrCtrl+L',
        click: () => {
          wm.focusSearch();
        },
      },
      {
        label: 'History',
        accelerator: 'CmdOrCtrl+H',
        click: () => {
          if (windowHasView(wm.mainWindow, wm.tabPageView)) {
            wm.tabPageView.webContents.send('toggle-history-modal');
          }
        },
      },
      {
        label: 'Debug',
        accelerator: 'CmdOrCtrl+D',
        click: () => {
          if (windowHasView(wm.mainWindow, wm.tabPageView)) {
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

function initBoot(wm: WindowManager) {
  let booted = false;
  const boot = () => {
    if (!booted) {
      booted = true;
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
  const mainWindow: BrowserWindow | null = new BrowserWindow({
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
    fullscreen: true,
    simpleFullscreen: true,
    webPreferences: {
      nodeIntegration: false,
      devTools: !app.isPackaged,
      contextIsolation: true,
    },
  });
  mainWindow.setAlwaysOnTop(true, 'status');
  return mainWindow;
}

function initShortcuts(wm: WindowManager) {
  let shortCut = 'Alt+Space';
  if (process.env.NODE_ENV === 'development') {
    shortCut = 'Ctrl+Alt+Space';
  }
  globalShortcut.register(shortCut, () => {
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
    wm.showWindow();
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

  const wm = new WindowManager(initWindow(), mixpanelManager);

  initBoot(wm);

  initFixedUpdate(wm);

  initShortcuts(wm);

  initMenu(wm);

  initApp(wm);
};
