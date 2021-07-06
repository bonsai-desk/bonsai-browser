import React from 'react';
import { render } from 'react-dom';
import App from './App';
import DebugApp from './DebugApp';
import UrlPeak from './url-peak';
import { Provider, rootStore, tabStore } from './data';
import './index.css';

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

if (document.getElementById('url-peak')) {
  render(<UrlPeak />, document.getElementById('url-peak'));
}
