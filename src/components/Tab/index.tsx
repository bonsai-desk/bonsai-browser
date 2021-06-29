import React from 'react';
import styled from 'styled-components';
import { observer } from 'mobx-react-lite';
import { useStore } from '../../data';
import TabObject from '../../interfaces/tab';

const TabParent = styled.div`
  background-color: #489aff;
  width: 125px;
  height: calc(100% - 1px);
  border-left: 1px solid black;
  border-top: 1px solid black;
  border-right: 1px solid black;
  border-radius: 10px 10px 0 0;
  display: flex;
  flex-wrap: wrap;
`;

interface ITab {
  tab: TabObject;
}

const Tab = observer(({ tab }: ITab) => {
  const { tabStore } = useStore();
  return (
    <TabParent>
      <div>{tab.url}</div>
      <button
        type="button"
        onClick={() => {
          tabStore.removeTab(tab.key);
        }}
      >
        X
      </button>
    </TabParent>
  );
});

export default Tab;
