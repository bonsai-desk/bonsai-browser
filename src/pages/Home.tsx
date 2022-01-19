/* eslint no-console: off */
import React, { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { ipcRenderer } from 'electron';
import styled from 'styled-components';
import { createTheme, ThemeProvider, useMediaQuery } from '@mui/material';
import { runInAction } from 'mobx';
import TabPageStore, { useStore } from '../store/tab-page-store';
import Header from '../components/URLBox';
import FuzzyTabs from '../components/FuzzyTabs';
import ClickerParent from '../components/Clicker';
import HistoryModal from '../components/History';
import Container from '../components/Container';
import Navigator from '../components/Navigator';
import GenericModal from '../components/GenericModal';
import SettingsModal from '../components/SettingsModal';
import GlobalStyle, { GlobalDark, GlobalLight } from '../GlobalStyle';
import Storyboard from '../components/StoryBoard';
import FloatingButtons from '../components/FloatingButtons';
import TagView from '../components/TagView';
import AllTagsView from '../components/AllTagsView';
import { FLOATING_BORDER_THICKNESS, View } from '../constants';
import HomeListView from '../components/HomeListView';

const MainContent = observer(() => {
  const { tabPageStore } = useStore();

  if (tabPageStore.View === View.FuzzySearch) {
    return <FuzzyTabs />;
  }
  if (tabPageStore.View === View.TagView) {
    return <TagView />;
  }
  if (tabPageStore.View === View.AllTagsView) {
    return <AllTagsView />;
  }
  return <HomeListView />;
});

const Content = observer(() => {
  const { tabPageStore } = useStore();

  if (tabPageStore.View === View.None) {
    return (
      <ClickerParent
        onClick={() => {
          ipcRenderer.send('click-main');
          runInAction(() => {
            tabPageStore.View = View.Tabs;
          });
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

const ContentParent = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-content: center;
  overflow: hidden;
`;

const Home = observer(() => {
  const { tabPageStore, keybindStore } = useStore();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      tabPageStore.handleKeyDown(e);
    }
    document.addEventListener('keydown', handleKeyDown);

    tabPageStore.bindMouseTrap();
    tabPageStore.registerKeybind('enter', () => {});

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      TabPageStore.unbindMouseTrap();
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

  const borderColor = 'var(--canvas-inactive-color)';

  const contentStyle = {
    width: tabPageStore.windowFloating
      ? `calc(100vw - ${2 * FLOATING_BORDER_THICKNESS}px)`
      : '100vw',
    height: tabPageStore.windowFloating
      ? `calc(100vh - ${2 * FLOATING_BORDER_THICKNESS}px)`
      : '100vh',
    margin: tabPageStore.windowFloating
      ? `${FLOATING_BORDER_THICKNESS}px`
      : '0',
    backgroundColor,
  };

  useEffect(() => {
    function drop(e: DragEvent) {
      if (e.dataTransfer) {
        const { files } = e.dataTransfer;
        for (let i = 0; i < files.length; i += 1) {
          const { path } = files[i];
          ipcRenderer.send('search-url', [
            `file:///${path}`,
            keybindStore.searchString(),
          ]);
        }
      }
    }

    function dragover(e: DragEvent) {
      e.preventDefault();
      e.stopPropagation();
    }

    document.addEventListener('drop', drop);
    document.addEventListener('dragover', dragover);

    return () => {
      document.removeEventListener('drop', drop);
      document.removeEventListener('dragover', dragover);
    };
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <Style />
      <Background
        style={{
          backgroundColor: borderColor,
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
              ipcRenderer.send('click-main');
            }

            runInAction(() => {
              tabPageStore.View = View.Tabs;
            });
          }
        }}
      >
        <ContentParent style={contentStyle}>
          <Content />
          <HistoryModal />
          <DebugModal />
          <SettingsModal />
          <FloatingButtons />
        </ContentParent>
      </Background>
    </ThemeProvider>
  );
});

export default Home;
