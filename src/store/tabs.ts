import { makeAutoObservable } from 'mobx';
import { ipcRenderer } from 'electron';
import TabObject from '../interfaces/tab';
import TabView from '../tab-view';

export default class TabStore {
  static id = 0;

  tabs: TabObject[] = [];

  activeTabId = -1;

  constructor() {
    makeAutoObservable(this);

    ipcRenderer.on('new-tab-created', (_, [url, id, tabView]) => {
      this.pushTab(url, id, tabView);
    });

    ipcRenderer.on('tab-removed', (_, id) => {
      this.popTab(id);
    });
  }

  setActiveTab(id: number) {
    this.activeTabId = id;
  }

  pushTab(url: string, id: number, view: TabView) {
    this.tabs.push({
      id,
      url,
      view,
    });
  }

  popTab(id: number) {
    this.tabs = this.tabs.filter((tab) => tab.id !== id);
  }

  addTab(url: string) {
    if (this.activeTabId === -1) {
      this.activeTabId = TabStore.id;
    }
    ipcRenderer.send('create-new-tab', [url, TabStore.id]);
    TabStore.id += 1;
  }

  removeTab(id: number) {
    if (this.activeTabId === id) {
      this.activeTabId = -1;
    }
    ipcRenderer.send('remove-tab', id);
  }
}
