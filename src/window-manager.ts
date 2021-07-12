import TabView from './tab-view';

export default class WindowManager {
  allTabViews: Record<number, TabView> = {};

  activeTabId = -1;

  findText = '';

  lastFindTextSearch = '';

  movingWindow = false;

  resetTextSearch() {
    this.lastFindTextSearch = '';
  }
}
