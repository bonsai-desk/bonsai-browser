import { makeAutoObservable } from 'mobx';
import { ipcRenderer } from 'electron';
import TabObject from '../interfaces/tab';

export default class TabStore {
  static id = 0;

  tabs: TabObject[] = [];

  activeTabId = -1;

  constructor() {
    makeAutoObservable(this);

    ipcRenderer.on('tab-removed', (_, id) => {
      if (id === this.activeTabId) {
        let setNewTab = false;
        for (let i = 0; i < this.tabs.length; i += 1) {
          if (this.tabs[i].id === id) {
            if (i === this.tabs.length - 1 && i > 0) {
              this.setActiveTab(this.tabs[i - 1].id);
              setNewTab = true;
              break;
            }
            if (i !== this.tabs.length - 1) {
              this.setActiveTab(this.tabs[i + 1].id);
              setNewTab = true;
              break;
            }
          }
        }
        if (!setNewTab) {
          this.setActiveTab(-1);
        }
      }
      this.popTab(id);
    });
  }

  getTabIndex(id: number): number {
    for (let i = 0; i < this.tabs.length; i += 1) {
      if (this.tabs[i].id === id) {
        return i;
      }
    }
    throw new Error(`Could not getTab with id ${id}`);
  }

  setActiveTab(id: number) {
    const oldId = this.activeTabId;
    this.activeTabId = id;
    ipcRenderer.send('set-tab', [id, oldId]);
  }

  pushTab(url: string, id: number) {
    this.tabs.push({
      id,
      url,
      searchBar: '',
    });
  }

  popTab(id: number) {
    this.tabs = this.tabs.filter((tab) => tab.id !== id);
  }

  addTab() {
    ipcRenderer.send('create-new-tab', TabStore.id);
    this.pushTab('', TabStore.id);
    this.setActiveTab(TabStore.id);
    TabStore.id += 1;
  }

  static removeTab(id: number) {
    ipcRenderer.send('remove-tab', id);
  }

  getActiveTabSearchBar(): string {
    for (let i = 0; i < this.tabs.length; i += 1) {
      if (this.tabs[i].id === this.activeTabId) {
        return this.tabs[i].searchBar;
      }
    }
    return '';
  }

  setActiveTabSearchBar(text: string) {
    for (let i = 0; i < this.tabs.length; i += 1) {
      if (this.tabs[i].id === this.activeTabId) {
        this.tabs[i].searchBar = text;
      }
    }
  }

  setActiveTabUrl(text: string) {
    for (let i = 0; i < this.tabs.length; i += 1) {
      if (this.tabs[i].id === this.activeTabId) {
        this.tabs[i].url = text;
      }
    }
  }
}
