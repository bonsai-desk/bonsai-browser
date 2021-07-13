/* eslint no-console: off */
import { ipcMain } from 'electron';
import WindowManager from './window-manager';

function addListeners(wm: WindowManager, browserPadding: number) {
  ipcMain.on('create-new-tab', (_, id) => {
    wm.createNewTab(id, browserPadding);
  });
  ipcMain.on('remove-tab', (event, id) => {
    wm.removeTab(id, event);
  });
  ipcMain.on('set-tab', (_, [id, oldId]) => {
    wm.setTab(id, oldId);
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
}

export default addListeners;
