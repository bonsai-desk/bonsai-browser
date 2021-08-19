import styled, { css } from 'styled-components';
import { observer } from 'mobx-react-lite';
import { ipcRenderer } from 'electron';
import React from 'react';
import { runInAction } from 'mobx';
import { useStore, View } from '../../store/tab-page-store';
import Favicon from '../Favicon';

const HistoryButtonParent = styled.button`
  position: absolute;
  bottom: 0;
  right: 0;
  width: 125px;
  height: 50px;
  border-radius: 10px;
  border: none;
  outline: none;

  :hover {
    background-color: lightgray;
  }
`;

export const HistoryButton = observer(() => {
  const { tabPageStore } = useStore();
  return (
    <HistoryButtonParent
      type="button"
      onClick={() => {
        runInAction(() => {
          tabPageStore.View = View.History;
        });
      }}
    >
      History
    </HistoryButtonParent>
  );
});

export const HistoryModalParent = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  width: 100vw;
  height: 100vh;

  ${({ active }: { active: boolean }) =>
    css`
      display: ${active ? 'block' : 'none'};
    `}
`;
export const HistoryModalBackground = styled.div`
  background-color: rgba(0.25, 0.25, 0.25, 0.35);
  position: absolute;
  left: 0;
  top: 0;
  width: 100vw;
  height: 100vh;
`;
export const HistoryModal = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  right: 0;
  margin: auto;
  width: 80vw;
  height: 80vh;
  background-color: lightgrey;
  border-radius: 25px;
  border: 2px solid white;
  box-shadow: 0 0 5px 0 rgba(0, 0, 0, 1);
  padding: 20px;
`;
export const HistoryResults = styled.div`
  //background-color: blue;
  overflow-y: auto;
  height: calc(100% - 40px);
`;
export const HistoryHeader = styled.div`
  width: 100%;
  height: 40px;
  display: flex;
  align-items: center;
  margin-bottom: 5px;
`;
export const HistorySearch = styled.input`
  outline: none;
  padding: 5px 10px 5px 10px;
  border-radius: 10000px;
  border: 2px solid white;
  //width: calc(100% - 20px - 4px);
  flex-grow: 1;
`;
export const ClearHistory = styled.button`
  width: 100px;
  height: 28px;
  border-radius: 1000000px;
  border: 2px solid white;
  outline: none;
  margin-left: 5px;
`;
export const HistoryResult = styled.div`
  background-color: gray;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 50px;
  text-align: center;
  border-radius: 25px;
  margin-bottom: 5px;
  padding-left: 20px;
  user-select: none;
  display: flex;
  align-items: center;

  :hover {
    cursor: pointer;
  }
`;
export const HistoryTitleDiv = styled.div`
  //background-color: red;
  line-height: 25px;
  margin: 10px;
  color: white;
`;
export const HistoryUrlDiv = styled.div`
  line-height: 25px;
  margin: 10px;
  color: lightgrey;
  font-size: 15px;
`;
export const History = observer(() => {
  const { tabPageStore } = useStore();
  let results;
  if (tabPageStore.searchResult === null) {
    results = Array.from(tabPageStore.historyMap.values()).map(
      (_, index, array) => {
        return array[array.length - 1 - index];
      }
    );
  } else {
    results = tabPageStore.searchResult;
  }

  return (
    <>
      {results.map((entry) => {
        return (
          <HistoryResult
            key={entry.key}
            onClick={() => {
              ipcRenderer.send('search-url', entry.url);
            }}
          >
            <Favicon src={entry.favicon} />
            <HistoryTitleDiv>{entry.title}</HistoryTitleDiv>
            <HistoryUrlDiv>{entry.url}</HistoryUrlDiv>
          </HistoryResult>
        );
      })}
    </>
  );
});
