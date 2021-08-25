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
import WindowManager from './window-manager';
import { ICON_PNG, ICON_SMALL_PNG } from '../constants';
import windowFixedUpdate from './calculate-window-physics';
import { windowHasView } from './utils';

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
    const height80 = wm.display.workAreaSize.height * 0.7;
    const floatingWidth = Math.floor(height80 * 0.7);
    const floatingHeight = Math.floor(height80);
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
    vibrancy: mac ? 'fullscreen-ui' : undefined, // menu, popover, hud, fullscreen-ui
    roundedCorners: false,
    visualEffectState: mac ? 'active' : undefined,
    webPreferences: {
      nodeIntegration: false,
      devTools: false,
      contextIsolation: true, // todo: do we need this? security concern?
    },
  });
  mainWindow.setAlwaysOnTop(true, 'status');
  return mainWindow;
}

function initShortcuts(wm: WindowManager) {
  let shortCut = 'Alt+Space';
  if (process.env.NODE_ENV === 'development') {
    shortCut = 'Shift+Alt+Space';
  }
  globalShortcut.register(shortCut, () => {
    if (!wm.mainWindow?.isVisible()) {
      wm.showWindow();
    } else {
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

  const wm = new WindowManager(initWindow());

  initBoot(wm);

  initFixedUpdate(wm);

  initShortcuts(wm);

  initMenu(wm);

  initApp(wm);
};
