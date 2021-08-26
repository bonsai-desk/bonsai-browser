import React from 'react';
import { render } from 'react-dom';
// import { v4 as uuidv4 } from 'uuid';
// import { getSnapshot, Instance } from 'mobx-state-tree';
import App from './pages/App';
import DebugApp from './pages/DebugApp';
import UrlPeek from './pages/UrlPeek';
import Find from './pages/Find';
import { Provider } from './utils/data';
import './index.css';
import Overlay from './pages/Overlay';
import TabStore from './store/tabs';
import TabPageStore, {
  Provider as TabPageStoreProvider,
} from './store/tab-page-store';
import Home from './pages/Home';
import createWorkspaceStore from './store/workspace';
import { hookListeners, HistoryStore } from './store/history-store';

if (document.getElementById('root')) {
  const tabStore = new TabStore();

  render(
    <Provider value={{ tabStore }}>
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

if (document.getElementById('overlay')) {
  render(<Overlay />, document.getElementById('overlay'));
}

if (document.getElementById('tab-page')) {
  const workspaceStore = createWorkspaceStore();
  const tabPageStore = new TabPageStore(workspaceStore);
  const historyStore = HistoryStore.create({ nodes: {}, active: '' });

  hookListeners(historyStore);

  render(
    <>
      <TabPageStoreProvider
        value={{ tabPageStore, workspaceStore, historyStore }}
      >
        <Home />
      </TabPageStoreProvider>
    </>,
    document.getElementById('tab-page')
  );
}
