import React from 'react';
import { observer } from 'mobx-react-lite';
import styled from 'styled-components';
// import Button from './components/Button';
// import { useMst } from './data';

// let newId = 5;
// const randomId = () => {
//   newId += 1;
//   return newId.toString();
// };

const TitleBarFull = styled.div`
  -webkit-app-region: drag;
  width: 100vw;
  height: 100vh;
  background-color: red;
`;

const TitleBarTop = styled.div`
  -webkit-app-region: drag;
  width: 100vw;
  height: 42px;
  background-color: #dee1e6;
  //border-bottom: 5px solid black;
`;

const TitleBarBottom = styled.div`
  -webkit-app-region: drag;
  width: 100vw;
  height: 36px;
  background-color: white;
  border-bottom: 1px solid #dee1e6;
  display: flex;
  flex-wrap: wrap;
  align-content: center;
`;

const RoundButton = styled.div`
  width: 28px;
  height: 28px;
  background-color: gray;
  border-radius: 9999px;
`;

const TitleBar = observer(() => {
  return (
    <TitleBarFull>
      <TitleBarTop>asdf</TitleBarTop>
      <TitleBarBottom>
        <RoundButton />
        <RoundButton />
        <RoundButton />
      </TitleBarBottom>
    </TitleBarFull>
  );
});

// const App = observer(() => {
//   const store = useMst();
//
//   function onClick() {
//     store.addTodo(randomId(), 'A thing');
//   }
//
//   return (
//     <div>
//       <Button type="button" onClick={onClick}>
//         button
//       </Button>
//       <ul>
//         {store.getTodosWhereDoneIs(false).map(([idx, todo]) => (
//           <li key={idx}>{`${todo.name}, id: ${idx}`}</li>
//         ))}
//       </ul>
//     </div>
//   );
// });

// {store.getTodosWhereDoneIs(false).map((info) => (
//   <div key={info[0]}>{info[1].name}</div>
// ))}

export default TitleBar;
