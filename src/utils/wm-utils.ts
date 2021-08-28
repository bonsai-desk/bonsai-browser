import { app, BrowserView, BrowserWindow, Display } from 'electron';
import path from 'path';
import fs from 'fs';
import { IWebView } from './interfaces';
import { urlToMapKey } from './utils';

function pointInBounds(
  mousePoint: Electron.Point,
  bounds: Electron.Rectangle
): boolean {
  const innerX0 = bounds.x;
  const innerX1 = bounds.x + bounds.width;

  const innerY0 = bounds.y;
  const innerY1 = bounds.y + bounds.height;

  const inX = innerX0 < mousePoint.x && mousePoint.x < innerX1;
  const inY = innerY0 < mousePoint.y && mousePoint.y < innerY1;

  return inX && inY;
}

function innerRectangle(
  aspect: number,
  windowSize: [number, number],
  verticalPadding: number
): Electron.Rectangle {
  const height = Math.max(windowSize[1], 0) - verticalPadding * 2;
  const width = Math.round(aspect * height);
  const xPadding = Math.round((windowSize[0] - width) / 2);
  return {
    x: xPadding,
    y: verticalPadding,
    width,
    height,
  };
}

export { pointInBounds, innerRectangle };

export function makeView(loadURL: string) {
  const newView = new BrowserView({
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // todo: do we need this? security concern?
    },
  });
  newView.webContents.loadURL(loadURL);
  return newView;
}

export const updateWebContents = (
  titleBarView: BrowserView,
  id: number,
  view: BrowserView
) => {
  titleBarView.webContents.send('web-contents-update', [
    id,
    view.webContents.canGoBack(),
    view.webContents.canGoForward(),
    view.webContents.getURL(),
  ]);
};

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

export function resizeAsTitleBar(
  view: BrowserView,
  height: number,
  pageInnerBounds: Electron.Rectangle
) {
  const titleBarBounds = {
    x: pageInnerBounds.x,
    y: pageInnerBounds.y,
    width: pageInnerBounds.width,
    height,
  };
  view.setBounds(titleBarBounds);
}

export function resizeAsPeekView(
  view: BrowserView,
  pageInnerBounds: Electron.Rectangle
) {
  const urlPeekWidth = 475;
  const urlPeekHeight = 20;
  view.setBounds({
    x: pageInnerBounds.x,
    y: pageInnerBounds.y + pageInnerBounds.height - urlPeekHeight,
    width: urlPeekWidth,
    height: urlPeekHeight,
  });
}

export function resizeAsWebView(
  tabView: IWebView,
  tabPage: BrowserView,
  bounds: Electron.Rectangle,
  urlHeight: number,
  windowSize: [number, number]
) {
  // const windowSize = this.mainWindow.getSize();
  tabPage.webContents.send('inner-bounds', {
    screen: { width: windowSize[0], height: windowSize[1] },
    bounds,
  });
  tabView.view.setBounds({
    x: bounds.x,
    y: bounds.y + urlHeight,
    width: bounds.width,
    height: bounds.height - urlHeight,
  });
}
export function resizeAsFindView(
  view: BrowserView,
  headerHeight: number,
  pageInnerBounds: Electron.Rectangle
) {
  const findViewWidth = 350;
  const findViewHeight = 50;
  const findViewMarginRight = 20;
  view.setBounds({
    x:
      pageInnerBounds.x +
      pageInnerBounds.width -
      findViewWidth -
      findViewMarginRight,
    y: pageInnerBounds.y + headerHeight,
    width: findViewWidth,
    height: findViewHeight,
  });
}

export function resizeAsTabPageView(
  view: BrowserView,
  windowSize: [number, number]
) {
  view.setBounds({
    x: 0,
    y: 0,
    width: windowSize[0],
    height: windowSize[1],
  });
}

export function resizeAsOverlayView(view: BrowserView, windowSize: number[]) {
  view.setBounds({
    x: 0,
    y: 0,
    width: windowSize[0],
    height: windowSize[1],
  });
}

export function currentWindowSize(window: BrowserWindow): [number, number] {
  const [x, y] = window.getSize();
  return [x, y];
}

export function innerBounds(
  mainWindow: BrowserWindow,
  padding: number
): Electron.Rectangle {
  return innerRectangle(4 / 3, currentWindowSize(mainWindow), padding);
}

export const updateContents = (
  webView: IWebView,
  titleBarView: BrowserView,
  tabPageView: BrowserView
) => {
  const url = webView.view.webContents.getURL();
  const key = urlToMapKey(url);
  if (webView.historyEntry === null || webView.historyEntry.key !== key) {
    webView.historyEntry = {
      url,
      key,
      title: '',
      favicon: '',
      openGraphData: { title: 'null', type: '', image: '', url: '' },
    };
  } else {
    webView.historyEntry.url = url;
  }

  titleBarView.webContents.send('web-contents-update', [
    webView.id,
    webView.view.webContents.canGoBack(),
    webView.view.webContents.canGoForward(),
    url,
  ]);
  tabPageView.webContents.send('url-changed', [webView.id, url]);
};

export function reloadTab(allWebViews: Record<number, IWebView>, id: number) {
  allWebViews[id]?.view.webContents.reload();
}

export function saveTabs(allWebViews: Record<number, IWebView>) {
  try {
    const savePath = path.join(app.getPath('userData'), 'openTabs.json');
    const saveData = Object.values(allWebViews).map((tabView) => {
      return {
        url:
          tabView.unloadedUrl === ''
            ? tabView.view.webContents.getURL()
            : tabView.unloadedUrl,
        title: tabView.title,
        favicon: tabView.favicon,
        imgString: tabView.imgString,
        scrollHeight: tabView.scrollHeight,
      };
    });
    fs.writeFileSync(savePath, JSON.stringify(saveData));
  } catch {
    //
  }
}

export function floatingSize(display: Display) {
  // return [1500, 1000];
  // return [500, 800];

  const height80 = display.workAreaSize.height * 0.7;
  const floatingWidth = Math.floor(height80 * 0.7);
  const floatingHeight = Math.floor(height80);
  return [floatingWidth, floatingHeight];
}
