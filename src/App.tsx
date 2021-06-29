import React from 'react';
import { observer } from 'mobx-react-lite';
import styled from 'styled-components';
import './App.global.css';
import { useStore } from './data';
import Tab from './components/Tab';
import TabObject from './interfaces/tab';

const TitleBarFull = styled.div`
  -webkit-app-region: drag;
  width: 100vw;
  height: 100vh;
  background-color: red;
`;

const TitleBarTop = styled.div`
  -webkit-app-region: drag;
  -webkit-user-select: none;
  width: 100vw;
  height: 32px;
  background-color: #dee1e6;
  //border-bottom: 5px solid black;
  display: flex;
  flex-wrap: wrap;
  align-content: baseline;
  padding-top: 10px;
  padding-left: 6px;
  padding-right: 10px;
`;

const TitleBarBottom = styled.div`
  width: 100vw;
  height: 36px;
  background-color: white;
  border-bottom: 1px solid #dee1e6;
  display: flex;
  flex-wrap: wrap;
  align-content: center;
  padding-left: 4px;
`;

const RoundButton = styled.div`
  width: 28px;
  height: 28px;
  background-color: gray;
  border-radius: 50%;
  margin-left: 2px;
`;

const NewTabButton = styled.button`
  width: 28px;
  height: 28px;
  border: none;
  background-color: #82dbff;
  border-radius: 50%;
  margin-left: 7px;
  margin-top: 1px;
`;

const URLBox = styled.input`
  width: 750px;
  margin-left: 10px;
`;

const TitleBar = observer(() => {
  const { tabStore } = useStore();
  return (
    <TitleBarFull>
      <TitleBarTop>
        {tabStore.tabs.map((tab: TabObject) => (
          <Tab key={tab.key} tab={tab} />
        ))}
        <NewTabButton
          onClick={() => {
            tabStore.addTab('');
          }}
        />
      </TitleBarTop>
      <TitleBarBottom>
        <RoundButton />
        <RoundButton />
        <RoundButton />
        <URLBox type="text" />
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
