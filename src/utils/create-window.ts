/* eslint no-console: off */
import {
  app,
  BrowserWindow,
  globalShortcut,
  Menu,
  MenuItem,
  MenuItemConstructorOptions,
  screen,
  Tray,
} from 'electron';
import log from 'electron-log';
import { autoUpdater } from 'electron-updater';
import addListeners from './listeners';
import WindowManager from './window-manager';
import { ICON_PNG, ICON_SMALL_PNG } from '../constants';
import windowFixedUpdate from './calculate-window-physics';
import { windowHasView } from './utils';

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

export function createTray(
  appIconPath: string,
  mainWindow: BrowserWindow,
  wm: WindowManager
) {
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
    mainWindow?.show();
  });
  appIcon.setToolTip('Bonsai Browser');
  appIcon.setContextMenu(contextMenu);
  return appIcon;
}

const installer = require('electron-devtools-installer');

export const installExtensions = async () => {
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload
    )
    .catch(console.log);
};
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
    width: 600,
    height: 300,
    minWidth: 50,
    minHeight: 50,
    show: false,
    icon: ICON_SMALL_PNG,
    vibrancy: 'fullscreen-ui', // menu, popover, hud, fullscreen-ui
    // enableLargerThanScreen: true,
    roundedCorners: false,
    visualEffectState: 'active',
    webPreferences: {
      nodeIntegration: false,
      devTools: false,
      contextIsolation: true, // todo: do we need this? security concern?
    },
  });

  if (process.platform === 'darwin') {
    app.dock.setIcon(ICON_PNG);
  }

  mainWindow.setAlwaysOnTop(true, 'status');

  const displays = screen.getAllDisplays();
  if (displays.length === 0) {
    throw new Error('No displays!');
  }
  const display = { activeDisplay: screen.getPrimaryDisplay() };

  const wm = new WindowManager(mainWindow, display);

  wm.mainWindow.on('close', () => {
    wm.saveHistory();
  });

  mainWindow.webContents.on('did-finish-load', () => {
    const mousePoint = screen.getCursorScreenPoint();
    display.activeDisplay = screen.getDisplayNearestPoint(mousePoint);
    wm.mainWindow.webContents.send(
      'set-padding',
      wm.browserPadding().toString()
    );

    // mainWindow?.show();
    // wm.unFloat(display.activeDisplay);
    // setTimeout(() => {
    //   wm.unSetTab();
    // }, 10);
  });

  mainWindow.on('blur', () => {
    if (!wm.windowFloating && wm.mainWindow.isVisible() && !wm.isPinned) {
      // wm.unFloat(display.activeDisplay);
      // wm.mainWindow?.hide();
      // wm.hideWindow();
      // }
    }
  });

  let booted = false;
  const boot = () => {
    if (!booted) {
      booted = true;
      wm.showWindow();
    }
  };
  wm.tabPageView.webContents.on('did-finish-load', boot);
  setTimeout(boot, 5000);

  wm.hideWindow();
  // wm.hideMainWindow();

  addListeners(wm);

  mainWindow.on('minimize', (e: Event) => {
    if (mainWindow !== null) {
      e.preventDefault();
      wm.hideWindow();
      // wm.hideMainWindow();
    }
  });

  wm.resize();

  const fixedTimeStep = 0.01;
  let lastFixedUpdateTime = 0;
  const fixedUpdate = () => {
    const deltaTime = fixedTimeStep;

    const height80 = display.activeDisplay.workAreaSize.height * 0.7;
    const floatingWidth = Math.floor(height80 * 0.7);
    const floatingHeight = Math.floor(height80);
    windowFixedUpdate(deltaTime, wm, floatingWidth, floatingHeight);
  };

  let startTime: number | null = null;
  // let lastTime = 0;

  const update = () => {
    const currentTime = Date.now() / 1000.0;
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

  const tray = createTray(ICON_SMALL_PNG, mainWindow, wm);

  mainWindow?.setResizable(false);

  const shortCut = 'Alt+Space';
  globalShortcut.register(shortCut, () => {
    if (!mainWindow?.isVisible()) {
      wm.showWindow();
    } else {
      wm.hideWindow();
    }
  });

  app.on('before-quit', () => {
    wm.mainWindow?.destroy();
  });

  mainWindow.on('closed', () => {
    tray.destroy();
    mainWindow = null;
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();

  // const menu = new Menu();

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

  app.on('activate', () => {
    wm.showWindow();
  });
};
