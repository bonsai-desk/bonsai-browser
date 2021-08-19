import React from 'react';
import { render } from 'react-dom';
import App from './pages/App';
import DebugApp from './pages/DebugApp';
import UrlPeek from './pages/UrlPeek';
import Find from './pages/Find';
import { Provider, RootModel } from './utils/data';
import './index.css';
import Overlay from './pages/Overlay';
import TabStore from './store/tabs';
import {
  Provider as TabPageStoreProvider,
  tabPageStore,
} from './store/tab-page-store';
import Tabs from './pages/Tabs';
import createWorkspaceStore from './store/workspace-store';

if (document.getElementById('root')) {
  const rootStore = RootModel.create({
    users: {
      '1': {
        id: '1',
        name: 'mweststreate',
      },
      '2': {
        id: '2',
        name: 'Bobbeh',
      },
      '3': {
        id: '3',
        name: 'Susan',
      },
    },
    todos: {
      '1': {
        name: 'eat a cake',
        done: true,
      },
      '2': {
        name: 'oof',
        done: false,
      },
    },
  });
  const tabStore = new TabStore();

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

if (document.getElementById('overlay')) {
  render(<Overlay />, document.getElementById('overlay'));
}

if (document.getElementById('tab-page')) {
  const workspaceStore = createWorkspaceStore();
  render(
    <>
      <TabPageStoreProvider value={{ tabPageStore, workspaceStore }}>
        <Tabs />
      </TabPageStoreProvider>
    </>,
    document.getElementById('tab-page')
  );
}
