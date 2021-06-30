import { BrowserView, BrowserWindow } from 'electron';

export const startWindowWidth = 1024;
export const startWindowHeight = 728;
export const headerHeight = 79;

class TabView {
  window: BrowserWindow;

  view: BrowserView;

  constructor(window: BrowserWindow) {
    if (!window) {
      throw new Error('"window" is not defined');
    }
    this.window = window;
    this.view = new BrowserView({
      webPreferences: {
        nodeIntegration: false,
        sandbox: true,
      },
    });

    this.resize();

    window.on('resize', () => {
      this.resize();
    });

    window.addBrowserView(this.view);
  }

  resize() {
    const windowSize = this.window.getSize();
    this.view.setBounds({
      x: 0,
      y: headerHeight,
      width: windowSize[0],
      height: Math.max(windowSize[1] - headerHeight, 0),
    });
  }
}

export default TabView;
