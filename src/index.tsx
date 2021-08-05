import React from 'react';
import { render } from 'react-dom';
import App from './pages/App';
import DebugApp from './pages/DebugApp';
import UrlPeek from './pages/url-peek';
import Find from './pages/find';
import { Provider, RootModel } from './utils/data';
import './index.css';
import MainWindow from './pages/main-window';
import Overlay from './pages/overlay';
import TabPage from './pages/tab-page';
import TabPageStore, {
  Provider as TabPageStoreProvider,
} from './store/tab-page-store';
import TabStore from './store/tabs';

if (document.getElementById('root')) {
  const initialState = RootModel.create({
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

  const rootStore = initialState;
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

if (document.getElementById('main-window')) {
  render(<MainWindow />, document.getElementById('main-window'));
}

if (document.getElementById('overlay')) {
  render(<Overlay />, document.getElementById('overlay'));
}

if (document.getElementById('tab-page')) {
  const tabPageStore = new TabPageStore();
  render(
    <TabPageStoreProvider value={{ tabPageStore }}>
      <TabPage />
    </TabPageStoreProvider>,
    document.getElementById('tab-page')
  );
}
