import { createContext, useContext } from 'react';
import TabStore from '../store/tabs';

interface AppContextInterface {
  tabStore: TabStore;
}
const RootStoreContext = createContext<null | AppContextInterface>(null);

export const { Provider } = RootStoreContext;

export function useStore() {
  const store = useContext(RootStoreContext);
  if (store === null) {
    throw new Error('Store cannot be null, please add a context provider');
  }
  return store;
}

export function getRootDomain(url: string): string {
  let testUrl;
  try {
    const { hostname } = new URL(url);
    testUrl = `http://${hostname}`;
  } catch {
    testUrl = url;
  }

  const ex = /\w*\./g;
  const result = testUrl.matchAll(ex);
  if (result !== null) {
    const results = [...result];
    if (results.length > 0) {
      const r = results[results.length - 1][0];
      return r.substring(0, r.length - 1);
    }
  }
  return '';
}
