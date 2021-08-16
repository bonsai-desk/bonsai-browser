import React from 'react';
import { render } from 'react-dom';
import { ipcRenderer } from 'electron';
import { getSnapshot } from 'mobx-state-tree';
import fs from 'fs';
import App from './pages/App';
import DebugApp from './pages/DebugApp';
import UrlPeek from './pages/url-peek';
import Find from './pages/find';
import { Provider, RootModel } from './utils/data';
import './index.css';
import MainWindow from './pages/main-window';
import Overlay from './pages/overlay';
import TabStore from './store/tabs';
// import TabsPage from './pages/tabs-page';
import {
  Provider as TabPageStoreProvider,
  tabPageStore,
} from './store/tab-page-store';
import Tabs from './pages/tabs-page';
import { ItemGroup, WorkspaceStore } from './store/workspace-store';

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

if (document.getElementById('main-window')) {
  render(<MainWindow />, document.getElementById('main-window'));
}

if (document.getElementById('overlay')) {
  render(<Overlay />, document.getElementById('overlay'));
}

if (document.getElementById('tab-page')) {
  const animationTime = 0.15;
  const workspaceStore = WorkspaceStore.create({
    hiddenGroup: ItemGroup.create({
      id: 'hidden',
      title: 'hidden',
      itemArrangement: [],
      zIndex: 0,
    }),
    groups: {},
    items: {},
  });

  console.log('reeee');

  ipcRenderer.send('request-snapshot-path');
  ipcRenderer.on('set-snapshot-path', (_, snapshotPath) => {
    workspaceStore.setSnapshotPath(snapshotPath);
    console.log(snapshotPath);
  });

  let lastSnapshotTime = 0;

  let lastTime = 0;
  let startTime = -1;
  const loop = (milliseconds: number) => {
    const currentTime = milliseconds / 1000;
    if (startTime === -1) {
      startTime = currentTime;
    }
    const time = currentTime - startTime;
    const deltaTime = time - lastTime;
    lastTime = time;

    if (time - lastSnapshotTime > 5) {
      lastSnapshotTime = time;
      if (workspaceStore.snapshotPath !== '') {
        const snapshot = getSnapshot(workspaceStore);
        const snapshotString = JSON.stringify(snapshot);
        fs.writeFileSync(workspaceStore.snapshotPath, snapshotString);
      }
    }

    workspaceStore.items.forEach((item) => {
      if (item.animationLerp !== 1) {
        item.setAnimationLerp(
          item.animationLerp + deltaTime * (1 / animationTime)
        );
        if (item.animationLerp > 1) {
          item.setAnimationLerp(1);
        }
      }
    });
    workspaceStore.groups.forEach((group) => {
      if (group.animationLerp !== 1) {
        group.setAnimationLerp(
          group.animationLerp + deltaTime * (1 / animationTime)
        );
        if (group.animationLerp > 1) {
          group.setAnimationLerp(1);
        }
      }
    });
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  // const group = workspaceStore.createGroup('media');
  // const sites = ['youtube', 'twitch', 'netflix', 'disney+', 'hulu'];
  // sites.forEach((site) => {
  //   workspaceStore.createItem(site, '', '', '', group);
  // });
  // const group2 = workspaceStore.createGroup('test');
  // for (let i = 1; i <= 20; i += 1) {
  //   workspaceStore.createItem(i.toString(), group2);
  // }

  render(
    <TabPageStoreProvider value={{ tabPageStore, workspaceStore }}>
      <Tabs />
    </TabPageStoreProvider>,
    document.getElementById('tab-page')
  );
}
