/* eslint no-console: off */
import { ipcMain } from 'electron';
import WindowManager from './window-manager';

function addListeners(wm: WindowManager) {
  ipcMain.on('create-new-tab', () => {
    wm.createNewTab();
  });
  ipcMain.on('remove-tab', (_, id) => {
    wm.removeTab(id);
  });
  ipcMain.on('set-tab', (_, id) => {
    wm.setTab(id);
  });
  ipcMain.on('load-url-in-tab', (event, [id, url]) => {
    wm.loadUrlInTab(id, url, event);
  });
  ipcMain.on('tab-back', (event, id) => {
    wm.tabBack(id, event);
  });
  ipcMain.on('tab-forward', (event, id) => {
    wm.tabForward(id, event);
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
}

export default addListeners;
