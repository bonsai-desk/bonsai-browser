import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import styled from 'styled-components';
import { useStore } from './data';
import Tab from './components/Tab';
import TabObject from './interfaces/tab';
import plusIcon from '../assets/plus.svg';

const TitleBarFull = styled.div`
  width: 100vw;
  height: 100vh;
  background-color: red;
`;

const TitleBarTop = styled.div`
  -webkit-app-region: drag;
  -webkit-user-select: none;
  width: calc(100% - 16px);
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
  width: calc(100% - 4px);
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

const NewTabButtonParent = styled.div`
  -webkit-app-region: no-drag;
  display: flex;
  justify-content: center;
  align-items: center;
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
  const [urlValue, setUrlValue] = useState('https://google.com');
  return (
    <TitleBarFull>
      <TitleBarTop>
        {tabStore.tabs.map((tab: TabObject) => (
          <Tab key={tab.id} tab={tab} />
        ))}
        <NewTabButtonParent
          onClick={() => {
            tabStore.addTab(urlValue);
          }}
        >
          <img src={plusIcon} alt="plus-icon" />
        </NewTabButtonParent>
      </TitleBarTop>
      <TitleBarBottom>
        <RoundButton />
        <RoundButton />
        <RoundButton />
        <URLBox
          type="text"
          value={urlValue}
          onInput={(e) => setUrlValue(e.currentTarget.value)}
        />
      </TitleBarBottom>
    </TitleBarFull>
  );
});

export default TitleBar;
