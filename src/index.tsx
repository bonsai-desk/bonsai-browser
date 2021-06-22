import React from 'react';
import { render } from 'react-dom';
import App from './App';
import { Provider, rootStore } from './data';

render(
  <Provider value={rootStore}>
    <App />
  </Provider>,
  document.getElementById('root')
);
