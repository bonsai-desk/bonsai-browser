import { makeAutoObservable } from 'mobx';
import { ipcRenderer } from 'electron';
import TabObject from '../interfaces/tab';
import TabView from '../tab-view';

export default class TabStore {
  static id = 0;

  tabs: TabObject[] = [];

  constructor() {
    makeAutoObservable(this);

    ipcRenderer.on('new-tab-created', (_, [url, id, tabView]) => {
      this.pushTab(url, id, tabView);
    });

    ipcRenderer.on('tab-removed', (_, id) => {
      this.popTab(id);
    });
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
    console.log(`test: ${id}`);
  }

  static addTab(url: string) {
    ipcRenderer.send('create-new-tab', [url, TabStore.id]);
    TabStore.id += 1;
  }

  static removeTab(id: number) {
    ipcRenderer.send('remove-tab', id);
  }
}
