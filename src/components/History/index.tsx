import { observer } from 'mobx-react-lite';
import { ipcRenderer } from 'electron';
import React, { useEffect, useRef } from 'react';
import { runInAction } from 'mobx';
import styled from 'styled-components';
import { useStore } from '../../store/tab-page-store';
import {
  ClearHistory,
  HistoryHeader,
  ModalSheet,
  ModalBackground,
  ModalParent,
  HistoryResult,
  HistoryResultsParent,
  HistorySearch,
  HistoryTitleDiv,
  HistoryUrlDiv,
} from './style';
import { View } from '../../constants';

const Favicon = styled.img`
  width: 16px;
  height: 16px;
`;

const HistoryResults = observer(() => {
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
    <HistoryResultsParent>
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
    </HistoryResultsParent>
  );
});

const HistoryModal = observer(() => {
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
    <ModalParent active={tabPageStore.View === View.History}>
      <ModalBackground
        onClick={() => {
          runInAction(() => {
            tabPageStore.View = View.Tabs;
          });
        }}
      />
      <ModalSheet>
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
        <HistoryResults />
      </ModalSheet>
    </ModalParent>
  );
});

export default HistoryModal;
