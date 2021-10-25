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

  // un-rooted if user dragged this tab out of its position in the tab order
  // don't care if it incidentally was re-ordered
  unRooted: boolean;

  // root web-view id in the chain of tabs where the links are open in new window
  ancestor: number | undefined;
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

export interface TabPageColumn {
  domain: string;

  tabs: TabPageTab[];
}
