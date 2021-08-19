import styled, { css } from 'styled-components';
import { observer } from 'mobx-react-lite';
import { ipcRenderer } from 'electron';
import React, { useEffect, useRef } from 'react';
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

const HistoryModalParent = styled.div`
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
const HistoryModalBackground = styled.div`
  background-color: rgba(0.25, 0.25, 0.25, 0.35);
  position: absolute;
  left: 0;
  top: 0;
  width: 100vw;
  height: 100vh;
`;
const HistoryModal = styled.div`
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
const HistoryResults = styled.div`
  //background-color: blue;
  overflow-y: auto;
  height: calc(100% - 40px);
`;
const HistoryHeader = styled.div`
  width: 100%;
  height: 40px;
  display: flex;
  align-items: center;
  margin-bottom: 5px;
`;
const HistorySearch = styled.input`
  outline: none;
  padding: 5px 10px 5px 10px;
  border-radius: 10000px;
  border: 2px solid white;
  //width: calc(100% - 20px - 4px);
  flex-grow: 1;
`;
const ClearHistory = styled.button`
  width: 100px;
  height: 28px;
  border-radius: 1000000px;
  border: 2px solid white;
  outline: none;
  margin-left: 5px;
`;
const HistoryResult = styled.div`
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
const HistoryTitleDiv = styled.div`
  //background-color: red;
  line-height: 25px;
  margin: 10px;
  color: white;
`;
const HistoryUrlDiv = styled.div`
  line-height: 25px;
  margin: 10px;
  color: lightgrey;
  font-size: 15px;
`;
const History = observer(() => {
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
const HistoryModalLocal = observer(() => {
  const { tabPageStore } = useStore();

  const historyBoxRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    tabPageStore.historyBoxRef = historyBoxRef;
  }, [tabPageStore]);

  useEffect(() => {
    const historyActive = tabPageStore.View === View.History;
    ipcRenderer.send('history-modal-active-update', historyActive);
    if (historyActive) {
      ipcRenderer.send('history-search', tabPageStore.historyText);
    }
  }, [tabPageStore.View, tabPageStore.historyText]);

  return (
    <HistoryModalParent active={tabPageStore.View === View.History}>
      <HistoryModalBackground
        onClick={() => {
          runInAction(() => {
            tabPageStore.View = View.Tabs;
          });
        }}
      />
      <HistoryModal>
        <HistoryHeader>
          <HistorySearch
            ref={historyBoxRef}
            placeholder="search history"
            value={tabPageStore.historyText}
            onInput={(e) => {
              tabPageStore.setHistoryText(e.currentTarget.value);
            }}
          />
          <ClearHistory
            type="button"
            onClick={() => {
              ipcRenderer.send('clear-history');
            }}
          >
            Clear History
          </ClearHistory>
        </HistoryHeader>
        <HistoryResults>
          <History />
        </HistoryResults>
      </HistoryModal>
    </HistoryModalParent>
  );
});
export default HistoryModalLocal;
