import React from 'react';
import { render } from 'react-dom';
import App from './App';
import DebugApp from './DebugApp';
import UrlPeek from './url-peek';
import Find from './find';
import { Provider, rootStore, tabStore } from './data';
import './index.css';
import MainWindow from './main-window';
import Overlay from './overlay';

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
