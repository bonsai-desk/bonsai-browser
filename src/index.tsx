import React from 'react';
import { render } from 'react-dom';
import App from './pages/App';
import DebugApp from './pages/DebugApp';
import UrlPeek from './pages/url-peek';
import Find from './pages/find';
import { Provider, rootStore, tabStore } from './utils/data';
import './index.css';
import MainWindow from './pages/main-window';
import Overlay from './pages/overlay';
import TabPage, { TabPageStore } from './pages/tab-page';

if (document.getElementById('root')) {
  render(
    <Provider value={{ rootStore, tabStore }}>
      <App />
    </Provider>,
    document.getElementById('root')
  );
}

if (document.getElementById('app')) {
  render(<DebugApp />, document.getElementById('app'));
}

if (document.getElementById('url-peek')) {
  render(<UrlPeek />, document.getElementById('url-peek'));
}

if (document.getElementById('find')) {
  render(<Find />, document.getElementById('find'));
}

if (document.getElementById('main-window')) {
  render(<MainWindow />, document.getElementById('main-window'));
}

if (document.getElementById('overlay')) {
  render(<Overlay />, document.getElementById('overlay'));
}

if (document.getElementById('tab-page')) {
  const tabPageStore = new TabPageStore();
  render(
    <TabPage tabPageStore={tabPageStore} />,
    document.getElementById('tab-page')
  );
}
