import { BrowserView, BrowserWindow } from 'electron';
// eslint-disable-next-line import/no-cycle
import { urlToMapKey, windowHasView } from './utils';
// eslint-disable-next-line import/no-cycle
import WindowManager from './window-manager';
import { PRELOAD } from '../constants';

export const headerHeight = 79 - 32 - 10;

export interface OpenGraphInfo {
  title: string;
  type: string;
  image: string;
  url: string;
}

export interface HistoryEntry {
  url: string;
  key: string;
  title: string;
  favicon: string;
  openGraphData: OpenGraphInfo;
}

function createOpenGraphInfo(): OpenGraphInfo {
  return { title: '', type: '', image: '', url: '' };
}

export function createHistoryEntry(url: string): HistoryEntry {
  return {
    url,
    key: urlToMapKey(url),
    title: '',
    favicon: '',
    openGraphData: createOpenGraphInfo(),
  };
}

class TabView {
  id: number;

  window: BrowserWindow;

  view: BrowserView;

  windowFloating = false;

  historyEntry: HistoryEntry | null = null;

  unloadedUrl = '';

  // string as base 64 encoded buffer of jpg data
  imgString = '';

  title = '';

  favicon = '';

  scrollHeight = 0;

  constructor(
    window: BrowserWindow,
    titleBarView: BrowserView,
    urlPeekView: BrowserView,
    findView: BrowserView,
    wm: WindowManager
  ) {
    if (!window) {
      throw new Error('"window" is not defined');
    }
    this.window = window;
    this.view = new BrowserView({
      webPreferences: {
        nodeIntegration: false,
        sandbox: true,
        preload: PRELOAD,
        contextIsolation: true, // todo: do we need this? security concern?
      },
    });
    this.view.setBackgroundColor('#FFFFFF');
    const { id } = this.view.webContents;
    this.id = id;

    this.view.webContents.on('new-window', (event, url) => {
      event.preventDefault();
      const newTabId = wm.createNewTab();
      wm.loadUrlInTab(newTabId, url);
    });

    this.view.webContents.on('page-title-updated', (_, title) => {
      if (this.historyEntry?.title === '') {
        this.historyEntry.title = title;
        this.updateHistory(wm);
      }
      this.title = title;
      titleBarView.webContents.send('title-updated', [id, title]);
      wm.tabPageView.webContents.send('title-updated', [id, title]);
    });

    const updateContents = () => {
      const url = this.view.webContents.getURL();
      const key = urlToMapKey(url);
      if (this.historyEntry === null || this.historyEntry.key !== key) {
        this.historyEntry = {
          url,
          key,
          title: '',
          favicon: '',
          openGraphData: { title: 'null', type: '', image: '', url: '' },
        };
      } else {
        this.historyEntry.url = url;
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
      if (favicons.length > 0) {
        if (this.historyEntry?.favicon === '') {
          // eslint-disable-next-line prefer-destructuring
          this.historyEntry.favicon = favicons[0];
          this.updateHistory(wm);
        }
        // eslint-disable-next-line prefer-destructuring
        this.favicon = favicons[0];
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
  }

  updateHistory(wm: WindowManager) {
    if (this.historyEntry !== null) {
      wm.addHistoryEntry(this.historyEntry);
    }
  }

  resize(bounds: Electron.Rectangle) {
    this.view.setBounds(bounds);
  }
}

export default TabView;
