import { BrowserView, BrowserWindow } from 'electron';
import TabView from './tab-view';
import {
  FIND_HTML,
  INDEX_HTML,
  OVERLAY_HTML,
  URL_PEEK_HTML,
} from '../constants';

function makeUrlPeekView() {
  const urlPeekView = new BrowserView({
    webPreferences: {
      nodeIntegration: true,
    },
  });
  urlPeekView.webContents.loadURL(URL_PEEK_HTML);
  return urlPeekView;
}

export default class WindowManager {
  allTabViews: Record<number, TabView> = {};

  activeTabId = -1;

  findText = '';

  lastFindTextSearch = '';

  movingWindow = false;

  mainWindow: BrowserWindow;

  titleBarView: BrowserView;

  urlPeekView: BrowserView;

  findView: BrowserView;

  overlayView: BrowserView;

  makeTitleBar() {
    const titleBarView = new BrowserView({
      webPreferences: {
        nodeIntegration: true,
      },
    });
    this.mainWindow.setBrowserView(titleBarView);
    this.mainWindow.setTopBrowserView(titleBarView);
    titleBarView.webContents.loadURL(INDEX_HTML);
    return titleBarView;
  }

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;

    this.titleBarView = this.makeTitleBar();
    this.urlPeekView = makeUrlPeekView();

    this.findView = new BrowserView({
      webPreferences: {
        nodeIntegration: true,
      },
    });
    // findView does not show up from Ctrl+F unless you do this for some reason
    mainWindow.addBrowserView(this.findView);
    mainWindow.setTopBrowserView(this.findView);
    mainWindow.removeBrowserView(this.findView);
    this.findView.webContents.loadURL(FIND_HTML);

    this.overlayView = new BrowserView({
      webPreferences: {
        nodeIntegration: true,
      },
    });
    this.overlayView.webContents.loadURL(OVERLAY_HTML);
  }

  resetTextSearch() {
    this.lastFindTextSearch = '';
  }

  reloadTab(id: number) {
    this.allTabViews[id].view.webContents.reload();
  }
}
