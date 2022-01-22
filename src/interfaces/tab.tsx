import { OpenGraphInfo } from '../utils/interfaces';

export interface TabPageTabInfo {
  id: string | number;

  favicon: string;

  title: string;

  url: string;

  openGraphInfo?: OpenGraphInfo;
}

export interface TabPageTab {
  id: number;

  lastAccessTime: number;

  url: string;

  title: string;

  image: string;

  favicon: string;

  openGraphInfo?: OpenGraphInfo;

  canGoBack: false;

  canGoForward: false;

  // un-rooted if user dragged this tab out of its position in the tab order
  // don't care if it incidentally was re-ordered
  unRooted: boolean;

  // root web-view id in the chain of tabs where the links are open in new window
  ancestor: number | undefined;

  zoomFactor: number;
}

export interface ITab {
  tab: TabPageTab;
  hover: boolean;
  active: boolean;
  callback?: () => void;
  disableButtons?: boolean;
  style?: Record<string, string>;
  width?: number;
  selected?: boolean;
}

export function tabTitle(tab: TabPageTabInfo): string {
  let title =
    tab.openGraphInfo !== null &&
    typeof tab.openGraphInfo !== 'undefined' &&
    tab.openGraphInfo.title !== '' &&
    tab.openGraphInfo.title !== 'null'
      ? tab.openGraphInfo.title
      : tab.title;
  if (!title) {
    title = 'New Tab';
  }
  return title;
}

export function tabImage(tab: TabPageTab): string {
  return tab.openGraphInfo !== null &&
    typeof tab.openGraphInfo !== 'undefined' &&
    tab.openGraphInfo.image !== ''
    ? tab.openGraphInfo.image
    : tab.image;
}
