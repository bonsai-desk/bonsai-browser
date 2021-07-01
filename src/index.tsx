import React from 'react';
// import { ipcRenderer } from 'electron';
// import { runInAction } from 'mobx';
import { render } from 'react-dom';
import App from './App';
import { Provider, rootStore, tabStore } from './data';
import './index.css';

// ipcRenderer.on('url-changed', (_, [id, newUrl]) => {
//   console.log(`${id} ${newUrl}`);
//   runInAction(() => {
//     tabStore.tabs[tabStore.getTabIndex(id)].searchBar = newUrl;
//     tabStore.tabs[tabStore.getTabIndex(id)].url = newUrl;
//   });
// });

render(
  <Provider value={{ rootStore, tabStore }}>
    <App />
  </Provider>,
  document.getElementById('root')
);
