import { Instance, types } from 'mobx-state-tree';
import { createContext, useContext } from 'react';
import TabStore from './store/tabs';

const User = types.model({
  id: types.identifier,
  name: types.optional(types.string, ''),
});

const Todo = types
  .model({
    name: types.optional(types.string, ''),
    done: types.optional(types.boolean, false),
    user: types.maybe(types.reference(types.late(() => User))),
  })
  .actions((self) => ({
    setName(newName: string) {
      self.name = newName;
    },
    setUser(user: Instance<typeof User>) {
      self.user = user;
    },
    toggle() {
      self.done = !self.done;
    },
  }));

const RootModel = types
  .model({
    users: types.map(User),
    todos: types.map(Todo),
  })
  .views((self) => ({
    get pendingCount() {
      return Array.from(self.todos.values()).filter((todo) => !todo.done)
        .length;
    },
    get completedCount() {
      return Array.from(self.todos.values()).filter((todo) => todo.done).length;
    },
    getTodosWhereDoneIs(done: boolean) {
      return Array.from(self.todos.entries()).filter(
        (item) => item[1].done === done
      );
    },
  }))
  .actions((self) => ({
    addTodo(id: string, name: string) {
      self.todos.set(id, { name });
    },
  }));

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

export const rootStore = initialState;
export const tabStore = new TabStore();

interface AppContextInterface {
  rootStore: RootInstance;
  tabStore: TabStore;
}

export type RootInstance = Instance<typeof RootModel>;
const RootStoreContext = createContext<null | AppContextInterface>(null);

export const { Provider } = RootStoreContext;

export function useStore() {
  const store = useContext(RootStoreContext);
  if (store === null) {
    throw new Error('Store cannot be null, please add a context provider');
  }
  return store;
}
