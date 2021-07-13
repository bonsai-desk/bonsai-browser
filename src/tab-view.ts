import { BrowserView, BrowserWindow } from 'electron';
import path from 'path';
// eslint-disable-next-line import/no-cycle
import { windowHasView } from './utils/utils';

export const headerHeight = 79;

class TabView {
  window: BrowserWindow;

  view: BrowserView;

  browserPadding: number;

  windowFloating = false;

  constructor(
    window: BrowserWindow,
    id: number,
    titleBarView: BrowserView,
    urlPeekView: BrowserView,
    findView: BrowserView,
    browserPadding: number
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
        preload: path.join(__dirname, './preload.js'),
      },
    });

    this.resize();

    window.on('resize', () => {
      this.resize();
    });

    this.view.webContents.on('page-title-updated', (_, title) => {
      titleBarView.webContents.send('title-updated', [id, title]);
    });

    const updateContents = () => {
      titleBarView.webContents.send('web-contents-update', [
        id,
        this.view.webContents.canGoBack(),
        this.view.webContents.canGoForward(),
        this.view.webContents.getURL(),
      ]);
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
        titleBarView.webContents.send('favicon-updated', [id, favicons[0]]);
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

    window.addBrowserView(this.view);
  }

  resize() {
    const windowSize = this.window.getSize();
    const padding = this.windowFloating ? 0 : this.browserPadding;
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
