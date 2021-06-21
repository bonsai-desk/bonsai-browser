import React from 'react';
import { render } from 'react-dom';
// import { IApp } from './interfaces/app';
import { getSnapshot, types } from 'mobx-state-tree';
import App from './App';
// import { observer } from 'mobx-react-lite';

const Todo = types
  .model({
    name: types.optional(types.string, ''),
    done: types.optional(types.boolean, false),
  })
  .actions((self) => ({
    setName(newName: string) {
      self.name = newName;
    },
    toggle() {
      self.done = !self.done;
    },
  }));

const User = types.model({
  name: types.optional(types.string, ''),
});

export const RootStore = types
  .model({
    users: types.map(User),
    todos: types.map(Todo),
  })
  .actions((self) => ({
    addTodo(id: string, name: string) {
      self.todos.set(id, Todo.create({ name }));
    },
  }));

const john = User.create();
const eat = Todo.create({ name: 'eat', done: true });

const store = RootStore.create({
  users: {},
});

console.log('Store:', getSnapshot(store));
console.log('John:', getSnapshot(john));
console.log('Eat: TODO:', getSnapshot(eat));

render(<App store={store} />, document.getElementById('root'));
