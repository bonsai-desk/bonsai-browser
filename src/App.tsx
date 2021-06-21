import React from 'react';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';
import { values } from 'mobx';
import { IApp } from './interfaces/app';
// import { observer } from 'mobx-react-lite';
// import { types, getSnapshot } from 'mobx-state-tree';
import Button from './components/Button';
import icon from '../assets/icon.svg';
import './App.global.css';
import { IPerson } from './interfaces/person';

function greet(person: IPerson): string {
  return `hello ${person.name} who is ${person.age} years old`;
}

const Hello = () => {
  const cameron: IPerson = { name: 'cameron', age: 25 };
  return (
    <div>
      <div className="Hello">
        <img width="200px" alt="icon" src={icon} />
      </div>
      <h1>{greet(cameron)}</h1>
      <Button>hello</Button>
      <Button>hello</Button>
      <div className="Hello">
        <a
          href="https://electron-react-boilerplate.js.org/"
          target="_blank"
          rel="noreferrer"
        >
          <button type="button">
            <span role="img" aria-label="books">
              📚
            </span>
            Read our docs
          </button>
        </a>
        <a
          href="https://github.com/sponsors/electron-react-boilerplate"
          target="_blank"
          rel="noreferrer"
        >
          <button type="button">
            <span role="img" aria-label="books">
              🙏
            </span>
            Donate
          </button>
        </a>
      </div>
    </div>
  );
};

let id = 0;
const randomId = () => {
  id += 1;
  return id.toString();
};

const App = (props: IApp) => {
  const { store } = props;
  function onClick() {
    store.addTodo(randomId(), 'new task');
  }
  return (
    <div>
      <button type="button" onClick={onClick}>
        Add Task
      </button>
      {values(store.todos).map((todo) => (
        <div key={todo.id}>{todo.id}</div>
      ))}
    </div>
  );
  return (
    <Router>
      <Switch>
        <Route path="/" component={Hello} />
      </Switch>
    </Router>
  );
};

export default App;
