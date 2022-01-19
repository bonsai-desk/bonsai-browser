/* eslint no-console: off */
import React from 'react';
import { render } from 'react-dom';
import { ipcRenderer } from 'electron';
import DatabaseProvider from '@nozbe/watermelondb/DatabaseProvider';
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
import loadOrCreateWatermelonDB from './watermelon';
import TagModal from './pages/TagModal';
import { TableName } from './watermelon/schema';
import { addTagStrings, getTagOrCreate } from './watermelon/databaseUtils';

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

if (document.getElementById('tag-modal')) {
  render(<TagModal />, document.getElementById('tag-modal'));
}

if (document.getElementById('tab-page')) {
  const tabStore = new TabStore();

  const keybindStore = createAndLoadKeybindStore();
  const historyStore = HistoryStore.create({ nodes: {}, active: '' });
  const tabPageStore = new TabPageStore(keybindStore, historyStore);

  hookListeners(historyStore);

  // dont' render anything until the database is loaded/created with the logged in user's id
  let currentUserId = '';
  tabPageStore.sessionChangeCallback = (userId) => {
    if (userId === currentUserId) {
      return;
    }
    currentUserId = userId;

    const database = loadOrCreateWatermelonDB(userId);

    if (localStorage.getItem('hasLaunchedOnce') !== 'true') {
      (async () => {
        const numTags = await database.get(TableName.TAGS).query().fetchCount();
        if (numTags === 0) {
          await addTagStrings(
            database,
            'https://bonsaibrowser.com/',
            'Cool Apps',
            {
              title: 'Bonsai | Web Browser for Research',
              favicon: 'https://bonsaibrowser.com/favicon.png',
            }
          );
          await getTagOrCreate(database, 'todo');
          await getTagOrCreate(database, 'Read Later');

          ipcRenderer.send(
            'create-tab-without-set',
            'https://bonsaibrowser.com/'
          );
        }
      })();
    }
    localStorage.setItem('hasLaunchedOnce', 'true');

    tabPageStore.database = database;

    const workspaceStore = createWorkspaceStore(database);

    render(
      <>
        <DatabaseProvider database={database}>
          <TabPageStoreProvider
            value={{
              tabPageStore,
              workspaceStore,
              historyStore,
              keybindStore,
              tabStore,
              database,
            }}
          >
            <Home />
          </TabPageStoreProvider>
        </DatabaseProvider>
      </>,
      document.getElementById('tab-page')
    );
  };
}

if (document.getElementById('onboarding')) {
  render(<Onboarding />, document.getElementById('onboarding'));
}
