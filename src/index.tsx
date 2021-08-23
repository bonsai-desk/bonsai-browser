import React from 'react';
import { render } from 'react-dom';
// import { v4 as uuidv4 } from 'uuid';
// import { getSnapshot, Instance } from 'mobx-state-tree';
import App from './pages/App';
import DebugApp from './pages/DebugApp';
import UrlPeek from './pages/UrlPeek';
import Find from './pages/Find';
import { Provider, RootModel } from './utils/data';
import './index.css';
import Overlay from './pages/Overlay';
import TabStore from './store/tabs';
import TabPageStore, {
  Provider as TabPageStoreProvider,
} from './store/tab-page-store';
import Home from './pages/Home';
import createWorkspaceStore from './store/workspace-store';
import { hookListeners, Root } from './store/history-store';

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

// function snap(a: any) {
//   console.dir(getSnapshot(a));
// }

// function snapArray(a: any[]) {
//   console.log('...');
//   a.forEach((x) => snap(x));
//   console.log('...');
// }

// let count = 0;

// function genNode(root: Instance<typeof Root>): INode {
//   const data = { url: 'url', scroll: 0, date: '' };
//   const a = Node.create({ id: count.toString(), data });
//   root.setNode(a);
//   count += 1;
//   return a;
// }

if (document.getElementById('tab-page')) {
  const workspaceStore = createWorkspaceStore();
  const tabPageStore = new TabPageStore(workspaceStore);

  const root = Root.create({ nodes: {} });

  hookListeners(root);

  render(
    <>
      <TabPageStoreProvider value={{ tabPageStore, workspaceStore }}>
        <Home />
      </TabPageStoreProvider>
    </>,
    document.getElementById('tab-page')
  );
}
