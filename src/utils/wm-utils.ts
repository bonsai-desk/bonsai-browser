import { BrowserView } from 'electron';

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

function innerBounds(
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

export { pointInBounds, innerBounds };

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
