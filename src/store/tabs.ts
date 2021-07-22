import { makeAutoObservable, runInAction } from 'mobx';
import { ipcRenderer } from 'electron';
import TabObject from '../interfaces/tab';

export default class TabStore {
  tabs: TabObject[] = [];

  activeTabId = -1;

  constructor() {
    makeAutoObservable(this);

    ipcRenderer.on('tab-removed', (_, id) => {
      // if (id === this.activeTabId) {
      //   let setNewTab = false;
      //   for (let i = 0; i < this.tabs.length; i += 1) {
      //     if (this.tabs[i].id === id) {
      //       if (i === this.tabs.length - 1 && i > 0) {
      //         this.setActiveTab(this.tabs[i - 1].id);
      //         setNewTab = true;
      //         break;
      //       }
      //       if (i !== this.tabs.length - 1) {
      //         this.setActiveTab(this.tabs[i + 1].id);
      //         setNewTab = true;
      //         break;
      //       }
      //     }
      //   }
      //   if (!setNewTab) {
      //     this.setActiveTab(-1);
      //   }
      // }
      if (id === this.activeTabId) {
        this.activeTabId = -1;
      }
      this.popTab(id);
    });
    ipcRenderer.on(
      'web-contents-update',
      (_, [id, canGoBack, canGoForward, url]) => {
        runInAction(() => {
          this.tabs[this.getTabIndex(id)].canGoBack = canGoBack;
          this.tabs[this.getTabIndex(id)].canGoForward = canGoForward;
          this.tabs[this.getTabIndex(id)].searchBar = url;
        });
      }
    );
    ipcRenderer.on('title-updated', (_, [id, title]) => {
      runInAction(() => {
        this.tabs[this.getTabIndex(id)].title = title;
      });
    });
    ipcRenderer.on('favicon-updated', (_, [id, faviconUrl]) => {
      this.tabs[this.getTabIndex(id)].faviconUrl = faviconUrl;
    });
    ipcRenderer.on('tabView-created-with-id', (_, id) => {
      this.pushTab(id);
    });
    ipcRenderer.on('tab-was-set', (_, id) => {
      this.activeTabId = id;
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

  pushTab(id: number) {
    this.tabs.push({
      id,
      searchBar: '',
      canGoBack: false,
      canGoForward: false,
      title: 'New Tab',
      faviconUrl: '',
    });
  }

  popTab(id: number) {
    this.tabs = this.tabs.filter((tab) => tab.id !== id);
  }

  static requestAddTab() {
    ipcRenderer.send('create-new-tab');
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
}
