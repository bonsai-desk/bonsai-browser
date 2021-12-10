import React, { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { ipcRenderer } from 'electron';
import { runInAction } from 'mobx';
import styled, { css } from 'styled-components';
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
import redX from '../../assets/x-letter.svg';
import home from '../../assets/home.svg';
import GenericModal from '../components/GenericModal';
import SettingsModal from '../components/SettingsModal';
import GlobalStyle, { GlobalDark, GlobalLight } from '../GlobalStyle';
import Storyboard from '../components/StoryBoard';

const BackHomeButtonParent = styled.div`
  width: 2rem;
  height: 2rem;
  border-radius: 0 0 10px 0;
  background-color: rgba(0, 0, 0, 0.1);
  position: absolute;
  top: 0;
  left: 0;
  transition-duration: 0.1s;

  background-size: 100%;
  background-repeat: no-repeat;
  background-position: center center;
  ${({ view }: { view: View }) => {
    if (view === View.Tabs) {
      return `background-image: url(${redX});`;
    }
    return css`
      background-image: url(${home});
      background-size: 60%;
    `;
  }}
  :hover {
    background-color: rgba(0, 0, 0, 0.5);
  }
`;

const BackHomeButton = observer(() => {
  const { tabPageStore } = useStore();

  return (
    <BackHomeButtonParent
      view={tabPageStore.View}
      onClick={() => {
        if (tabPageStore.View === View.Tabs) {
          ipcRenderer.send('toggle');
        } else if (tabPageStore.View === View.WorkSpace) {
          runInAction(() => {
            tabPageStore.View = View.Tabs;
          });
        } else {
          ipcRenderer.send('click-main');
        }
      }}
    />
  );
});

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

const FloatingShadow = styled.div`
  position: fixed;
  top: 0;
  left: 0;

  //background-color: white;
  box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.5);

  width: calc(100% - 20px);
  height: calc(100% - 20px - 37px - 10px);

  margin: 57px 10px 10px 10px;
`;

const Background = styled.div`
  width: 100vw;
  height: 100vh;
  margin: 0;
  overflow: hidden;
  //background-color: #e5e1e7;
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

  if (tabPageStore.windowFloating) {
    return <FloatingShadow />;
  }

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
        style={{ backgroundColor }}
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
        <Style />
        <BackHomeButton />
        <Content />
        <HistoryModal />
        <DebugModal />
        <SettingsModal />
      </Background>
    </ThemeProvider>
  );
});

export default Home;
