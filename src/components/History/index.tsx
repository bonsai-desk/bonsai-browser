import { observer } from 'mobx-react-lite';
import { ipcRenderer } from 'electron';
import React, { useEffect, useRef } from 'react';
import { runInAction } from 'mobx';
import { useStore, View } from '../../store/tab-page-store';
import Favicon from '../Favicon';
import {
  ClearHistory,
  HistoryButtonParent,
  HistoryHeader,
  HistoryModal,
  HistoryModalBackground,
  HistoryModalParent,
  HistoryResult,
  HistoryResults,
  HistorySearch,
  HistoryTitleDiv,
  HistoryUrlDiv,
} from './style';

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
