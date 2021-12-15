import React from 'react';
import { render } from 'react-dom';
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
import Onboarding from './pages/Onboarding';
import { createAndLoadKeybindStore } from './store/keybinds';

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
  const tabStore = new TabStore();
  const workspaceStore = createWorkspaceStore();
  const keybindStore = createAndLoadKeybindStore();
  const historyStore = HistoryStore.create({ nodes: {}, active: '' });
  const tabPageStore = new TabPageStore(
    workspaceStore,
    keybindStore,
    historyStore
  );
  keybindStore.loadFromFile('');

  hookListeners(historyStore);

  render(
    <>
      <TabPageStoreProvider
        value={{
          tabPageStore,
          workspaceStore,
          historyStore,
          keybindStore,
          tabStore,
        }}
      >
        <Home />
      </TabPageStoreProvider>
    </>,
    document.getElementById('tab-page')
  );
}

if (document.getElementById('onboarding')) {
  render(<Onboarding />, document.getElementById('onboarding'));
}
