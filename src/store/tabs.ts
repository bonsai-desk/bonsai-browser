import { makeAutoObservable } from 'mobx';
import TabObject from '../interfaces/tab';

let id = 0;

class TabStore {
  tabs: TabObject[] = [];

  constructor() {
    makeAutoObservable(this);
    this.addTab('https://google.com');
    this.addTab('https://youtube.com');
  }

  addTab(url: string) {
    this.tabs.push({
      key: id.toString(),
      url,
    });
    id += 1;
  }

  removeTab(key: string) {
    this.tabs = this.tabs.filter((tab) => tab.key !== key);
  }
}

export default TabStore;
