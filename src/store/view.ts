import { types } from 'mobx-state-tree';
import { ipcRenderer } from 'electron';

const ViewStore = types
  .model({
    activeURL: '',
  })
  .actions((self) => ({
    loadURL(url: string) {
      self.activeURL = url;
      ipcRenderer.send('load-url', url);
    },
  }));

export default ViewStore;
