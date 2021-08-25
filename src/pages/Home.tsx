import React, { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { ipcRenderer } from 'electron';
import { runInAction } from 'mobx';
import { useStore, View } from '../store/tab-page-store';
import URLBox from '../components/URLBox';
import PinButton from '../components/PinButton';
import FuzzyTabs from '../components/FuzzyTabs';
import ClickerParent from '../components/Clicker';
import Background from '../components/Background';
import History from '../components/History';
import Columns from '../components/Columns';
import Footer from '../components/Footer';
import Container from '../components/Container';
import Workspace from '../components/Workspace';
import Navigator from '../components/Navigator';
import NavigatorDebug from '../NavigatorDebug';
import {
  HistoryModal,
  HistoryModalBackground,
  HistoryModalParent,
} from '../components/History/style';

const MainContent = observer(() => {
  const { tabPageStore } = useStore();

  if (tabPageStore.View === View.WorkSpace) {
    return (
      <>
        <ClickerParent
          onClick={() => {
            tabPageStore.View = View.Tabs;
          }}
        />
        <Workspace />
      </>
    );
  }
  return tabPageStore.View === View.Tabs ? <Columns /> : <FuzzyTabs />;
});

const Content = observer(() => {
  const { tabPageStore } = useStore();

  if (tabPageStore.View === View.None) {
    return (
      <ClickerParent
        onClick={() => {
          ipcRenderer.send('click-main');
        }}
      />
    );
  }

  if (tabPageStore.View === View.Navigator) {
    return <Navigator />;
  }

  return (
    <Container>
      <URLBox />
      <MainContent />
      <Footer />
    </Container>
  );
});

const Debug = observer(() => {
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
    <HistoryModalParent active={tabPageStore.View === View.NavigatorDebug}>
      <HistoryModalBackground
        onClick={() => {
          runInAction(() => {
            tabPageStore.View = View.Tabs;
          });
        }}
      />
      <HistoryModal>
        <NavigatorDebug />
      </HistoryModal>
    </HistoryModalParent>
  );
});

const Home = observer(() => {
  const { tabPageStore } = useStore();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      tabPageStore.handleKeyDown(e);
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [tabPageStore]);

  const [hasRunOnce, setHasRunOnce] = useState(false);

  useEffect(() => {
    if (hasRunOnce) {
      return;
    }
    setHasRunOnce(true);
  }, [hasRunOnce, tabPageStore]);

  return (
    <Background>
      <Content />
      <History />
      <Debug />
      <PinButton />
    </Background>
  );
});

export default Home;
