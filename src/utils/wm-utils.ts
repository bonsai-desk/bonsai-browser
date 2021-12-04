/* eslint-disable no-console */
import {
  app,
  BrowserView,
  BrowserWindow,
  Display,
  HandlerDetails,
  WebContents,
} from 'electron';
import path from 'path';
import fs from 'fs';
import { INavigateData, IWebView } from './interfaces';
import { parseMap, urlToMapKey } from './utils';
import { floatingWindowEdgeMargin } from './calculate-window-target';
import {
  floatingPadding,
  floatingTitleBarHeight,
  floatingTitleBarSpacing,
  LOWER_BOUND,
  ONBOARDING_HTML,
} from '../constants';
import { ICON_SMALL_PNG } from '../main-constants';

const DEBUG = false;

export function log(str: string) {
  if (DEBUG) {
    console.log(str);
  }
}

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
  // const height = Math.max(windowSize[1], 0) - verticalPadding * 2;
  const height = Math.max(windowSize[1], 0) - verticalPadding - LOWER_BOUND;

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

export function makeWebContentsSafe(webContents: WebContents) {
  if (app.isPackaged) {
    webContents.on('will-navigate', (event, navigationUrl) => {
      console.log(`view tried to navigate ${navigationUrl}`);
      event.preventDefault();
    });
    webContents.setWindowOpenHandler(({ url }) => {
      console.log(`view tried to open ${url}`);
      return { action: 'deny' };
    });
  }
}

export function makeOnboardingWindow(): BrowserWindow {
  const w = 1000;
  const h = 600;
  const onboardingWindow: BrowserWindow = new BrowserWindow({
    width: w,
    height: h,
    minWidth: w,
    minHeight: h,
    maxWidth: w,
    maxHeight: h,
    show: false,
    icon: ICON_SMALL_PNG,
    fullscreen: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  onboardingWindow.webContents.openDevTools({ mode: 'detach' });
  // todo let the window know if did finish onboarding
  makeWebContentsSafe(onboardingWindow.webContents);
  onboardingWindow.webContents.loadURL(ONBOARDING_HTML);
  return onboardingWindow;
}

export function makeView(loadURL: string) {
  const newView = new BrowserView({
    webPreferences: {
      nodeIntegration: true,
      devTools: !app.isPackaged,
      contextIsolation: false,
    },
  });
  makeWebContentsSafe(newView.webContents);
  newView.webContents.loadURL(loadURL);
  return newView;
}

export const updateWebContents = (
  titleBarView: BrowserView,
  id: number,
  view: BrowserView
) => {
  // todo verify that this is hooked up
  if (view.webContents) {
    const args = [
      id,
      view.webContents.canGoBack(),
      view.webContents.canGoForward(),
      view.webContents.getURL(),
    ];
    titleBarView.webContents.send('web-contents-update', args);
  }
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
    x: 0,
    y: 0,
    width: pageInnerBounds.width,
    height,
  };
  view.setBounds(titleBarBounds);
}

export function resizePeekView(
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

export function resizeFindView(
  view: BrowserView,
  yOffset: number,
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
    y: pageInnerBounds.y + yOffset,
    width: findViewWidth,
    height: findViewHeight,
  });
}

export function currentWindowSize(window: BrowserWindow): [number, number] {
  const [x, y] = window.getSize();
  return [x, y];
}

export function innerBounds(window: BrowserWindow): Electron.Rectangle {
  // const ratio = 15;
  // const padding = Math.floor(window.getBounds().height / ratio);
  // return innerRectangle(4 / 3, currentWindowSize(window), padding);

  const windowBounds = window.getBounds();
  const topPadding = 70;
  const padding = 20;

  return {
    x: padding,
    y: topPadding,
    width: windowBounds.width - padding * 2,
    height: windowBounds.height - topPadding - padding,
  };
}

export function resizeOverlayView(view: BrowserView, windowSize: number[]) {
  view.setBounds({
    x: 0,
    y: 0,
    width: windowSize[0],
    height: floatingTitleBarHeight + floatingPadding + floatingTitleBarSpacing,
  });
}

export const updateContents = (webView: IWebView, tabPageView: BrowserView) => {
  updateWebContents(tabPageView, webView.id, webView.view);
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

  // titleBarView.webContents.send('web-contents-update', [
  //   webView.id,
  //   webView.view.webContents.canGoBack(),
  //   webView.view.webContents.canGoForward(),
  //   url,
  // ]);
  tabPageView.webContents.send('url-changed', [webView.id, url]);
};

export function reloadTab(allWebViews: Record<number, IWebView>, id: number) {
  allWebViews[id]?.view.webContents.reload();
}

export function saveTabs(allWebViews: Record<number, IWebView>) {
  try {
    const savePath = path.join(app.getPath('userData'), 'openTabs');
    const openTabsData = Object.values(allWebViews).map((tabView) => {
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
    const openTabsString = JSON.stringify(openTabsData, null, '  ');
    fs.writeFileSync(savePath, openTabsString);
  } catch {
    //
  }
}

export function floatingSize(display: Display) {
  const height =
    (display.workAreaSize.height - floatingWindowEdgeMargin * 2) * 0.95;
  const floatingWidth = Math.floor(height * 0.85);
  const floatingHeight = Math.floor(height);
  return [floatingWidth, floatingHeight];
}

export function showOnboardingWindow(onboardingWindow: BrowserWindow | null) {
  onboardingWindow?.show();
  onboardingWindow?.focus();
  onboardingWindow?.webContents.focus();
}

export function tryParseMap(jsonString: string) {
  try {
    return { success: true, map: parseMap(jsonString) };
  } catch {
    //
  }
  return { success: false, map: null };
}

export function tryParseJSON(jsonString: string) {
  try {
    return { success: true, object: JSON.parse(jsonString) };
  } catch {
    //
  }
  return { success: false, object: null };
}

export function goBack(webView: IWebView, alertTargets: BrowserView[]) {
  webView.forwardUrl = webView.view.webContents.getURL();
  webView.forwardUrls.push(webView.view.webContents.getURL());
  webView.view.webContents.goBack();
  alertTargets.forEach((target) => {
    target.webContents.send('go-back', { id: webView.id });
  });
}

export function handleGoForward(
  webView: IWebView,
  alertTargets: BrowserView[]
) {
  log(`${webView.id} request go forward [${webView.forwardUrls}]`);
  const forwardUrl = webView.forwardUrls[webView.forwardUrls.length - 1];

  webView.forwardUrls.pop();
  webView.view.webContents.goForward();
  alertTargets.forEach((target) => {
    target.webContents.send('go-forward', { id: webView.id, forwardUrl });
  });
}

const keyMap: Record<string, string> = {
  Comma: ',',
  Period: '.',
  Slash: '/',
  Semicolon: ';',
  Quote: '"',
  Meta: 'Cmd',
  BracketLeft: '[',
  BracketRight: ']',
  Backslash: '\\',
  Backquote: '`',
  Minus: '-',
  Equal: '=',
  Digit0: '0',
  Digit1: '1',
  Digit2: '2',
  Digit3: '3',
  Digit4: '4',
  Digit5: '5',
  Digit6: '6',
  Digit7: '7',
  Digit8: '8',
  Digit9: '9',
  KeyA: 'A',
  KeyB: 'B',
  KeyC: 'C',
  KeyD: 'D',
  KeyE: 'E',
  KeyF: 'F',
  KeyG: 'G',
  KeyH: 'H',
  KeyI: 'I',
  KeyJ: 'J',
  KeyK: 'K',
  KeyL: 'L',
  KeyM: 'M',
  KeyN: 'N',
  KeyO: 'O',
  KeyP: 'P',
  KeyQ: 'Q',
  KeyR: 'R',
  KeyS: 'S',
  KeyT: 'T',
  KeyU: 'U',
  KeyV: 'V',
  KeyW: 'W',
  KeyX: 'X',
  KeyY: 'Y',
  KeyZ: 'Z',
  Numpad0: 'num0',
  Numpad1: 'num1',
  Numpad2: 'num2',
  Numpad3: 'num3',
  Numpad4: 'num4',
  Numpad5: 'num5',
  Numpad6: 'num6',
  Numpad7: 'num7',
  Numpad8: 'num8',
  Numpad9: 'num9',
  NumpadDecimal: 'numdec',
  NumpadAdd: 'numadd',
  NumpadSubtract: 'numsub',
  NumpadMultiply: 'nummult',
  NumpadDivide: 'numdiv',
};

function translateKey(jsKey: string) {
  if (keyMap[jsKey]) {
    return keyMap[jsKey];
  }

  return jsKey;
}

export function translateKeys(jsKeys: string[]) {
  if (jsKeys) {
    return jsKeys.map(translateKey);
  }
  return jsKeys;
}

export function handleInPageNavigateWithoutGesture(
  view: IWebView,
  url: string,
  alertTargets: BrowserView[]
) {
  log(`${view.id} will-navigate-no-gesture ${url}`);
  alertTargets.forEach((target) => {
    target.webContents.send('will-navigate-no-gesture', { id: view.id, url });
  });
}

export function handleWillNavigate(
  view: IWebView,
  url: string,
  alertTargets: BrowserView[]
) {
  log(`${view.id} will-navigate ${url}`);
  view.forwardUrl = undefined;
  view.forwardUrls = [];
  alertTargets.forEach((target) => {
    target.webContents.send('will-navigate', { id: view.id, url });
  });
}

export function handleDidNavigate(
  view: IWebView,
  data: INavigateData,
  alertTargets: BrowserView[]
) {
  alertTargets.forEach((target) => {
    target.webContents.send('did-navigate', { id: view.id, ...data });
  });
}

export interface IAction {
  action: 'deny';
}

export function genHandleWindowOpen(
  view: IWebView,
  alertTargets: BrowserView[]
) {
  return (details: HandlerDetails): IAction => {
    alertTargets.forEach((target) => {
      target.webContents.send('new-window-intercept', {
        senderId: view.id,
        details,
      });
    });
    return { action: 'deny' };
  };
}
