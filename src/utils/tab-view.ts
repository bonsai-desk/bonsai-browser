import { BrowserView, BrowserWindow } from 'electron';
import path from 'path';
// eslint-disable-next-line import/no-cycle
import { windowHasView } from './utils';
// eslint-disable-next-line import/no-cycle
import WindowManager from './window-manager';

export const headerHeight = 79 - 32 - 10; // 79 or 79 - 32 - 10

class TabView {
  window: BrowserWindow;

  view: BrowserView;

  browserPadding: number;

  windowFloating = false;

  historyEntry: {
    url: string;
    time: number;
    title: string;
    favicon: string;
  } | null = null;

  constructor(
    window: BrowserWindow,
    id: number,
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
        preload: path.join(__dirname, './utils/preload.js'),
        contextIsolation: false, // todo: do we need this? security concern?
      },
    });

    const updateHistory = () => {
      if (this.historyEntry !== null) {
        wm.history.add(this.historyEntry);
        wm.tabPageView.webContents.send('add-history', [
          this.historyEntry.url,
          this.historyEntry.time,
          this.historyEntry.title,
          this.historyEntry.favicon,
        ]);
      }
    };

    this.view.webContents.on('page-title-updated', (_, title) => {
      if (this.historyEntry?.title === '') {
        this.historyEntry.title = title;
        if (this.historyEntry.favicon !== '') {
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
        this.historyEntry = { url, time, title: '', favicon: '' };
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
          if (this.historyEntry.title !== '') {
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
