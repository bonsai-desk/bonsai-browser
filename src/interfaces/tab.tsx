import { OpenGraphInfo } from '../utils/tab-view';

export interface TabPageTab {
  id: number;

  lastAccessTime: number;

  url: string;

  title: string;

  image: string;

  favicon: string;

  openGraphInfo: OpenGraphInfo | null;
}

export interface ITab {
  title: string;
  imgUrl: string;
  tab: TabPageTab;
}

export interface TabPageColumn {
  domain: string;

  tabs: TabPageTab[];
}
