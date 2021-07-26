/* eslint no-console: off */
import { ipcMain } from 'electron';
import WindowManager from './window-manager';
import { OpenGraphInfo } from './tab-view';

function addListeners(wm: WindowManager) {
  ipcMain.on('create-new-tab', () => {
    wm.createNewTab();
  });
  ipcMain.on('remove-tab', (_, id) => {
    wm.removeTabs([id]);
  });
  ipcMain.on('remove-tabs', (_, ids) => {
    wm.removeTabs(ids);
  });
  ipcMain.on('set-tab', (_, id) => {
    wm.setTab(id);
  });
  ipcMain.on('load-url-in-tab', (_, [id, url]) => {
    wm.loadUrlInTab(id, url);
  });
  ipcMain.on('tab-back', (_, id) => {
    wm.tabBack(id);
  });
  ipcMain.on('tab-forward', (_, id) => {
    wm.tabForward(id);
  });
  ipcMain.on('tab-refresh', (_, id) => {
    wm.tabRefresh(id);
  });
  ipcMain.on('close-find', () => {
    wm.closeFind();
  });
  ipcMain.on('find-text-change', (_, boxText) => {
    wm.findTextChange(boxText);
  });
  ipcMain.on('find-previous', () => {
    wm.findPrevious();
  });
  ipcMain.on('find-next', () => {
    wm.findNext();
  });
  ipcMain.on('windowMoving', (_, { mouseX, mouseY }) => {
    wm.windowMoving(mouseX, mouseY);
  });
  ipcMain.on('windowMoved', () => {
    wm.windowMoved();
  });
  ipcMain.on('wheel', (_, [deltaX, deltaY]) => {
    const activeTabView = wm.allTabViews[wm.activeTabId];
    if (activeTabView !== null) {
      activeTabView.view.webContents.executeJavaScript(`
        window.scrollBy(${deltaX}, ${deltaY});
      `);
    }
  });
  ipcMain.on('search-url', (_, url) => {
    wm.tabPageView.webContents.send('close-history-modal');
    const newTabId = wm.createNewTab();
    wm.loadUrlInTab(newTabId, url);
    wm.setTab(newTabId);
  });
  ipcMain.on('history-search', (_, query) => {
    if (query === '') {
      wm.tabPageView.webContents.send('history-search-result', null);
    } else {
      const result = wm.history.search(query, { limit: 50 });
      wm.tabPageView.webContents.send(
        'history-search-result',
        result.map(
          (entry: {
            item: {
              url: string;
              time: number;
              title: string;
              favicon: string;
              openGraphData: OpenGraphInfo;
            };
          }) => {
            return [
              entry.item.url,
              entry.item.time,
              entry.item.title,
              entry.item.favicon,
              entry.item.openGraphData,
            ];
          }
        )
      );
    }
  });
  ipcMain.on('history-modal-active-update', (_, historyModalActive) => {
    wm.historyModalActive = historyModalActive;
  });
}

export default addListeners;
