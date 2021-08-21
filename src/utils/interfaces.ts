import { BrowserView, BrowserWindow } from 'electron';

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

export interface IWebView {
  id: number;

  window: BrowserWindow;

  view: BrowserView;

  windowFloating: boolean;

  historyEntry: HistoryEntry | null;

  unloadedUrl: string;

  // string as base 64 encoded buffer of jpg data
  imgString: string;

  title: string;

  favicon: string;

  scrollHeight: number;
}

export interface TabInfo {
  url: string;

  title: string;

  favicon: string;

  imgString: string;

  scrollHeight: number;
}
