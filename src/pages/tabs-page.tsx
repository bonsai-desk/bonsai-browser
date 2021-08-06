import React from 'react';
import {
  Provider as TabPageStoreProvider,
  tabPageStore,
} from '../store/tab-page-store';
import Tabs from './tabs';

function App() {
  return (
    <>
      <TabPageStoreProvider value={{ tabPageStore }}>
        <Tabs />
      </TabPageStoreProvider>
    </>
  );
}

export default App;
