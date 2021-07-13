/* eslint no-console: off */
import { app, BrowserView, BrowserWindow, Menu, Tray } from 'electron';
import TabView from './tab-view';
import { windowHasView } from './utils';
import WindowManager from './window-manager';

const installer = require('electron-devtools-installer');

export function closeSearch(
  window: BrowserWindow,
  findView: BrowserView,
  windowManger: WindowManager,
  callback: () => void
) {
  if (windowHasView(window, findView)) {
    window.removeBrowserView(findView);
    const tabView = windowManger.allTabViews[windowManger.activeTabId];
    if (typeof tabView !== 'undefined') {
      tabView.view.webContents.stopFindInPage('clearSelection');
      callback();
    }
  }
}

export const updateWebContents = (
  event: Electron.IpcMainEvent,
  id: number,
  tabView: TabView
) => {
  event.reply('web-contents-update', [
    id,
    tabView.view.webContents.canGoBack(),
    tabView.view.webContents.canGoForward(),
    tabView.view.webContents.getURL(),
  ]);
};
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

export function createTray(appIconPath: string, mainWindow: BrowserWindow) {
  const appIcon = new Tray(appIconPath);
  console.log('aa');
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open',
      click() {
        mainWindow?.show();
      },
    },
    {
      label: 'Close',
      click() {
        mainWindow?.hide();
      },
    },
    {
      label: 'Exit',
      click() {
        // app.isQuiting = true;
        app.quit();
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

export function handleFindText(
  tabView: BrowserView,
  search: string,
  lastSearch: string,
  searchBack?: boolean
) {
  if (tabView === null) {
    return '';
  }
  if (search === '') {
    // stop finding if find text is empty
    tabView.webContents.stopFindInPage('clearSelection');
    return '';
  }
  const shouldSearchBack = typeof searchBack !== 'undefined' && searchBack;
  const sameAsLastSearch = search === lastSearch;
  tabView.webContents.findInPage(search, {
    forward: !shouldSearchBack,
    findNext: !sameAsLastSearch,
  });

  return search;
}
