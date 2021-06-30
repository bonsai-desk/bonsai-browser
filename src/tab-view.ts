import { BrowserView, BrowserWindow } from 'electron';

export const startWindowWidth = 1024;
export const startWindowHeight = 728;
export const headerHeight = 79;

class TabView {
  view: BrowserView;

  constructor(window: BrowserWindow, startUrl: string) {
    if (!window) {
      throw new Error('"window" is not defined');
    }
    this.view = new BrowserView({
      webPreferences: {
        nodeIntegration: false,
        sandbox: true,
      },
    });
    window.addBrowserView(this.view);
    this.view.setBounds({
      x: 0,
      y: headerHeight,
      width: startWindowWidth,
      height: Math.max(startWindowHeight - headerHeight, 0),
    });

    this.view.webContents.loadURL(startUrl);

    window.on('resize', () => {
      const windowSize = window.getSize();
      this.view.setBounds({
        x: 0,
        y: headerHeight,
        width: windowSize[0],
        height: Math.max(windowSize[1] - headerHeight, 0),
      });
    });
  }
}

export default TabView;
