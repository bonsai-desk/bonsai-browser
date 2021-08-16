/* eslint no-console: off */
import {
  app,
  BrowserWindow,
  globalShortcut,
  Menu,
  MenuItem,
  MenuItemConstructorOptions,
  screen,
} from 'electron';
import log from 'electron-log';
import { autoUpdater } from 'electron-updater';
import { createTray, installExtensions } from './windows';
import addListeners from './listeners';
import WindowManager from './window-manager';
import { ICON_PNG, ICON_SMALL_PNG, MAIN_HTML } from '../constants';
import windowFixedUpdate from './calculate-window-physics';
import { windowHasView } from './utils';

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

app.on('ready', () => {
  // prevent app from moving out of fullscreen when it launches in development
  if (process.platform === 'darwin' && process.env.NODE_ENV === 'development') {
    app.dock.hide();
  }
});

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
    icon: ICON_SMALL_PNG,
    webPreferences: {
      nodeIntegration: true,
      devTools: false,
      contextIsolation: false, // todo: do we need this? security concern?
    },
  });
  if (process.platform === 'darwin') {
    app.dock.setIcon(ICON_PNG);
  }

  mainWindow.setAlwaysOnTop(true);

  mainWindow.webContents.loadURL(MAIN_HTML);

  const displays = screen.getAllDisplays();
  if (displays.length === 0) {
    throw new Error('No displays!');
  }
  const display = { activeDisplay: screen.getPrimaryDisplay() };

  const wm = new WindowManager(mainWindow, display);

  // app.on('activate', () => {
  //   // On macOS it's common to re-create a window in the app when the
  //   // dock icon is clicked and there are no other windows open.
  //   if (!mainWindow?.isVisible()) {
  //     wm.mainWindow.show();
  //     wm.unFloat(display.activeDisplay);
  //     setTimeout(() => {
  //       // todo: search box does not get highlited on macos unless we do this hack
  //       wm.setTab(-1);
  //     }, 10);
  //   }
  // });

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
    mainWindow?.show();
    wm.unFloat(display.activeDisplay);
    setTimeout(() => {
      wm.setTab(-1);
    }, 10);
  });

  mainWindow.on('blur', () => {
    if (!wm.windowFloating && wm.mainWindow.isVisible() && !wm.isPinned) {
      // const mousePoint = screen.getCursorScreenPoint();
      // const activeDisplay = screen.getDisplayNearestPoint(mousePoint);
      // const mouseOnWindowDisplay =
      //   activeDisplay.id === WindowManager.display.activeDisplay.id;
      // if (mouseOnWindowDisplay) {
      wm.unFloat(display.activeDisplay);
      wm.setTab(-1);
      wm.hideMainWindow();
      // }
    }
  });

  wm.hideMainWindow();

  addListeners(wm);

  mainWindow.on('minimize', (e: Event) => {
    if (mainWindow !== null) {
      e.preventDefault();
      wm.hideMainWindow();
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

  const update = (now: number) => {
    const currentTime = now / 1000.0;
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
    // const activeTabView = wm.allTabViews[wm.activeTabId];
    if (!mainWindow?.isVisible()) {
      const mousePoint = screen.getCursorScreenPoint();
      display.activeDisplay = screen.getDisplayNearestPoint(mousePoint);

      wm.mainWindow.setVisibleOnAllWorkspaces(true, {
        visibleOnFullScreen: true,
      });
      wm.mainWindow.show();
      wm.mainWindow.setVisibleOnAllWorkspaces(false, {
        visibleOnFullScreen: true,
      });
      wm.isPinned = false;
      wm.mainWindow.webContents.send('set-pinned', wm.isPinned);
      wm.unFloat(display.activeDisplay);
      // wm.windowPosition[0] = display.activeDisplay.workArea.x;
      // wm.windowPosition[1] = display.activeDisplay.workArea.y;
      // wm.windowSize.width = display.activeDisplay.workArea.width;
      // wm.windowSize.height =
      //   display.activeDisplay.workArea.height +
      //   (process.platform === 'darwin' ? 0 : 1); // todo: on windows if you make it the same size as monitor, everything breaks!?!??!?!?
      // wm.updateMainWindowBounds();
      // wm.resize();
      if (wm.activeTabId === -1) {
        // todo: search box does not get highlighted on macos unless we do this hack
        setTimeout(() => {
          wm.setTab(-1);
        }, 10);
      }
    } else {
      wm.unFloat(display.activeDisplay);
      // wm.setTab(-1);
      // toggle();
      mainWindow?.hide();
    }
    // } else if (
    //   !wm.windowFloating &&
    //   activeTabView !== null &&
    //   typeof activeTabView !== 'undefined' &&
    //   activeTabView.view.webContents.getURL() !== ''
    // ) {
    //   wm.float();
    // } else {
    //   wm.unFloat(display.activeDisplay);
    //   wm.setTab(-1);
    //   mainWindow?.hide();
    // }
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
};
