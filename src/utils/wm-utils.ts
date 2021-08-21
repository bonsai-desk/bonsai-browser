import { BrowserView } from 'electron';
import { IWebView } from './interfaces';

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
  windowSize: [number, number],
  verticalPadding: number
): Electron.Rectangle {
  const height = Math.max(windowSize[1], 0) - verticalPadding * 2;
  const width = Math.round((4 / 3) * height);
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

export function resizeAsTabView(
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
  const hh = urlHeight;
  bounds.y += hh;
  bounds.height -= hh;
  tabView.view.setBounds(bounds);
}
export function resizeAsFindView(
  view: BrowserView,
  padding: number,
  hh: number,
  windowSize: number[]
) {
  const findViewWidth = 350;
  const findViewHeight = 50;
  const findViewMarginRight = 20;
  view.setBounds({
    x: windowSize[0] - findViewWidth - findViewMarginRight - padding,
    y: hh + padding,
    width: findViewWidth,
    height: findViewHeight,
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
