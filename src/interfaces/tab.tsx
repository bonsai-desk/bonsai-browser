import { OpenGraphInfo } from '../utils/interfaces';

export interface TabPageTab {
  id: number;

  lastAccessTime: number;

  url: string;

  title: string;

  image: string;

  favicon: string;

  openGraphInfo: OpenGraphInfo | null;

  canGoBack: false;
  canGoForward: false;
}

export interface ITab {
  tab: TabPageTab;
  hover: boolean;
  selected: boolean;
  callback?: () => void;
  disableButtons?: boolean;
}

export interface TabPageColumn {
  domain: string;

  tabs: TabPageTab[];
}
