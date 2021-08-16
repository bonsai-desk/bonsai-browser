/* eslint no-console: off */
import { app, BrowserView, BrowserWindow, Menu, Tray } from 'electron';
// eslint-disable-next-line import/no-cycle
import WindowManager from './window-manager';

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
