import React, { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { ipcRenderer } from 'electron';
import styled from 'styled-components';
import { createTheme, ThemeProvider, useMediaQuery } from '@mui/material';
import { useStore, View } from '../store/tab-page-store';
import Header from '../components/URLBox';
import FuzzyTabs from '../components/FuzzyTabs';
import ClickerParent from '../components/Clicker';
import HistoryModal from '../components/History';
import HomePageTabs from '../components/Columns';
import Footer from '../components/Footer';
import Container from '../components/Container';
import Workspace from '../components/Workspace';
import Navigator, { clickMain } from '../components/Navigator';
import GenericModal from '../components/GenericModal';
import SettingsModal from '../components/SettingsModal';
import GlobalStyle, { GlobalDark, GlobalLight } from '../GlobalStyle';
import Storyboard from '../components/StoryBoard';
import FloatingButtons from '../components/FloatingButtons';

const MainContent = observer(() => {
  const { tabPageStore, workspaceStore } = useStore();

  if (tabPageStore.View === View.WorkSpace) {
    let workspace = workspaceStore.workspaces.get(
      workspaceStore.activeWorkspaceId
    );
    if (typeof workspace === 'undefined') {
      workspaceStore.workspaces.forEach((w) => {
        if (typeof workspace === 'undefined') {
          workspaceStore.setActiveWorkspaceId(w.id);
          workspace = w;
        }
      });
    }
    if (typeof workspace !== 'undefined') {
      return <Workspace workspace={workspace} />;
    }
    tabPageStore.setUrlText('');
  }
  if (tabPageStore.View === View.FuzzySearch) {
    return <FuzzyTabs />;
  }
  return <HomePageTabs />;
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

  const containerContent =
    tabPageStore.View === View.Navigator ? <Navigator /> : <MainContent />;

  return (
    <Container>
      <Header onViewPage={tabPageStore.View === View.Navigator} />
      {containerContent}
      <Footer />
    </Container>
  );
});

const DebugModal = observer(() => {
  const { tabPageStore } = useStore();

  if (tabPageStore.View !== View.NavigatorDebug) {
    return <div />;
  }

  return (
    <GenericModal view={View.NavigatorDebug}>
      <Storyboard />
    </GenericModal>
  );
});

const Background = styled.div`
  width: 100vw;
  height: 100vh;
  margin: 0;
  overflow: hidden;
`;

const Border = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  z-index: 100000;
  width: calc(100vw - 6px);
  height: calc(100vh - 6px);
  border-radius: 10px;
  border: 3px solid rgba(0, 0, 0, 0.3);
  pointer-events: none;
`;

const Home = observer(() => {
  const { tabPageStore, keybindStore } = useStore();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      tabPageStore.handleKeyDown(e);
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [tabPageStore]);

  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

  const mode =
    // eslint-disable-next-line no-nested-ternary
    keybindStore.settings.theme === 'system'
      ? prefersDarkMode
        ? 'dark'
        : 'light'
      : keybindStore.settings.theme;

  const Style = () => {
    if (mode === 'light') {
      return <GlobalLight />;
    }
    if (mode === 'dark') {
      return <GlobalDark />;
    }
    return <GlobalStyle />;
  };

  const theme = React.useMemo(
    () =>
      createTheme({
        palette: {
          mode,
        },
      }),
    [mode]
  );

  const backgroundColor = keybindStore.settings.backgroundEnabled
    ? `#${keybindStore.settings.background}`
    : 'var(--background-color)';

  return (
    <ThemeProvider theme={theme}>
      <Background
        style={{
          backgroundColor,
          borderRadius: tabPageStore.windowFloating ? '10px' : 0,
        }}
        onMouseDown={(e) => {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          const { id } = e.target;
          if (
            tabPageStore.View !== View.Tabs &&
            (id === 'header' || id === 'footer' || id === 'workspaceBackground')
          ) {
            if (tabPageStore.View === View.Navigator) {
              clickMain();
            } else {
              if (tabPageStore.View === View.WorkSpace) {
                ipcRenderer.send(
                  'mixpanel-track',
                  'toggle off workspace with background click'
                );
              }
              tabPageStore.View = View.Tabs;
            }
          }
        }}
      >
        <Border
          style={{ display: tabPageStore.windowFloating ? 'block' : 'none' }}
        />
        <Style />
        <Content />
        <HistoryModal />
        <DebugModal />
        <SettingsModal />
        <FloatingButtons />
      </Background>
    </ThemeProvider>
  );
});

export default Home;
