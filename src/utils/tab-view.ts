import { BrowserView, BrowserWindow, ipcMain, shell } from 'electron';
// eslint-disable-next-line import/no-cycle
import { windowHasView } from './utils';
// eslint-disable-next-line import/no-cycle
import WindowManager from './window-manager';
import { PRELOAD } from '../constants';

export const headerHeight = 79 - 32 - 10; // 79 or 79 - 32 - 10

export interface OpenGraphInfo {
  title: string;
  type: string;
  image: string;
  url: string;
}

export interface HistoryEntry {
  url: string;
  time: number;
  title: string;
  favicon: string;
  openGraphData: OpenGraphInfo;
}

class TabView {
  id: number;

  window: BrowserWindow;

  view: BrowserView;

  browserPadding: number;

  windowFloating = false;

  historyEntry: HistoryEntry | null = null;

  constructor(
    window: BrowserWindow,
    titleBarView: BrowserView,
    urlPeekView: BrowserView,
    findView: BrowserView,
    browserPadding: number,
    wm: WindowManager
  ) {
    if (!window) {
      throw new Error('"window" is not defined');
    }
    this.window = window;
    this.browserPadding = browserPadding;
    this.view = new BrowserView({
      webPreferences: {
        nodeIntegration: false,
        sandbox: true,
        preload: PRELOAD,
        contextIsolation: false, // todo: do we need this? security concern?
      },
    });
    const { id } = this.view.webContents;
    this.id = id;

    this.view.webContents.on('new-window', (event, url) => {
      event.preventDefault();
      // shell.openExternal(url);
      const newTabId = wm.createNewTab();
      wm.loadUrlInTab(newTabId, url);
    });

    const updateHistory = () => {
      if (this.historyEntry !== null) {
        wm.addHistoryEntry(this.historyEntry);
      }
    };

    this.view.webContents.on('page-title-updated', (_, title) => {
      if (this.historyEntry?.title === '') {
        this.historyEntry.title = title;
        if (
          this.historyEntry.favicon !== '' &&
          this.historyEntry.openGraphData.title !== 'null'
        ) {
          updateHistory();
        }
      }
      titleBarView.webContents.send('title-updated', [id, title]);
      wm.tabPageView.webContents.send('title-updated', [id, title]);
    });

    const updateContents = () => {
      const url = this.view.webContents.getURL();
      if (wm.lastHistoryAdd !== url) {
        wm.lastHistoryAdd = url;
        const time = new Date().getTime();
        this.historyEntry = {
          url,
          time,
          title: '',
          favicon: '',
          openGraphData: { title: 'null', type: '', image: '', url: '' },
        };
      }
      titleBarView.webContents.send('web-contents-update', [
        id,
        this.view.webContents.canGoBack(),
        this.view.webContents.canGoForward(),
        url,
      ]);
      wm.tabPageView.webContents.send('url-changed', [id, url]);
    };

    this.view.webContents.on('did-navigate', () => {
      if (windowHasView(window, findView)) {
        window.removeBrowserView(findView);
      }
      updateContents();
    });
    this.view.webContents.on('did-frame-navigate', () => {
      updateContents();
    });
    this.view.webContents.on('did-navigate-in-page', () => {
      updateContents();
    });

    this.view.webContents.on('page-favicon-updated', (_, favicons) => {
      // favicons.map((url) => console.log(url));
      if (favicons.length > 0) {
        if (this.historyEntry?.favicon === '') {
          // eslint-disable-next-line prefer-destructuring
          this.historyEntry.favicon = favicons[0];
          if (
            this.historyEntry.openGraphData.title !== 'null' &&
            this.historyEntry.title !== ''
          ) {
            updateHistory();
          }
        }
        titleBarView.webContents.send('favicon-updated', [id, favicons[0]]);
        wm.tabPageView.webContents.send('favicon-updated', [id, favicons[0]]);
      }
    });

    this.view.webContents.on('update-target-url', (_, url) => {
      if (url === '') {
        if (windowHasView(window, urlPeekView)) {
          window.removeBrowserView(urlPeekView);
        }
      }
      if (url !== '') {
        if (!windowHasView(window, urlPeekView)) {
          window.addBrowserView(urlPeekView);
          window.setTopBrowserView(urlPeekView);
          wm.resize();
        }
        urlPeekView.webContents.send('peek-url-updated', url);
      }
    });

    this.view.webContents.on('found-in-page', (_, result) => {
      findView.webContents.send('find-results', [
        result.activeMatchOrdinal,
        result.matches,
      ]);
    });

    ipcMain.on('open-graph-data', (event, data: OpenGraphInfo) => {
      if (event.sender.id === id) {
        if (this.historyEntry?.openGraphData.title === 'null') {
          this.historyEntry.openGraphData = data;
          if (
            this.historyEntry.favicon !== '' &&
            this.historyEntry.title !== ''
          ) {
            updateHistory();
          }
        }
      }
    });

    // window.addBrowserView(this.view);
    // resize();
  }

  resize() {
    const windowSize = this.window.getSize();
    const padding = this.windowFloating ? 10 : this.browserPadding;
    const hh = this.windowFloating ? 0 : headerHeight;
    this.view.setBounds({
      x: padding,
      y: hh + padding,
      width: windowSize[0] - padding * 2,
      height: Math.max(windowSize[1] - hh, 0) - padding * 2,
    });
  }
}

export default TabView;
