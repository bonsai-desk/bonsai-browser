import React from 'react';
import { observer } from 'mobx-react-lite';
import Button from './components/Button';
import './App.global.css';
import { useMst } from './data';

let newId = 5;
const randomId = () => {
  newId += 1;
  return newId.toString();
};

const App = observer(() => {
  const store = useMst();

  function onClick() {
    store.addTodo(randomId(), 'A thing');
  }

  return (
    <div>
      <Button type="button" onClick={onClick}>
        button
      </Button>
      <ul>
        {store.getTodosWhereDoneIs(false).map(([idx, todo]) => (
          <li key={idx}>{`${todo.name}, id: ${idx}`}</li>
        ))}
      </ul>
    </div>
  );
});

// {store.getTodosWhereDoneIs(false).map((info) => (
//   <div key={info[0]}>{info[1].name}</div>
// ))}

export default App;
