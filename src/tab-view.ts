import { BrowserView, BrowserWindow } from 'electron';
import path from 'path';
// eslint-disable-next-line import/no-cycle
import { windowHasView } from './main.dev';

export const startWindowWidth = 1024;
export const startWindowHeight = 728;
export const headerHeight = 79;

class TabView {
  window: BrowserWindow;

  view: BrowserView;

  constructor(
    window: BrowserWindow,
    id: number,
    titleBarView: BrowserView,
    urlPeekView: BrowserView,
    findView: BrowserView
  ) {
    if (!window) {
      throw new Error('"window" is not defined');
    }
    this.window = window;
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

    window.addBrowserView(this.view);
  }

  resize() {
    const windowSize = this.window.getSize();
    this.view.setBounds({
      x: 0,
      y: headerHeight,
      width: windowSize[0],
      height: Math.max(windowSize[1] - headerHeight, 0),
    });
  }
}

export default TabView;
