import React from 'react';
import { render } from 'react-dom';
import App from './App';
import { Provider, rootStore, tabStore } from './data';

render(
  <Provider value={{ rootStore, tabStore }}>
    <App />
  </Provider>,
  document.getElementById('root')
);
