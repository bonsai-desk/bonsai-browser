/* eslint no-console: off */
import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { ipcRenderer } from 'electron';
import styled from 'styled-components';
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  createTheme,
  IconButton,
  ThemeProvider,
  useMediaQuery,
} from '@mui/material';
import { runInAction } from 'mobx';
import { Close } from '@material-ui/icons';
import { Typography } from '@material-ui/core';
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

const UpdateModalBackground = styled.div`
  position: absolute;
  right: 25px;
  bottom: 25px;
  box-shadow: rgba(100, 100, 111, 0.2) 0 7px 29px 0;
`;

const UpdateModalContent = observer(
  ({ onClick, onClose }: { onClick: () => void; onClose: () => void }) => {
    return (
      <Box>
        <Card sx={{ maxWidth: 345 }}>
          <CardHeader
            action={
              <IconButton aria-label="settings" size="small" onClick={onClose}>
                <Close fontSize="inherit" />
              </IconButton>
            }
            title="New version available"
            // subheader="An improved version of Bonsai is available. Please restart now to
            //   upgrade."
          />
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              An improved version of Bonsai is available. Please restart now to
              upgrade.
            </Typography>
          </CardContent>
          <CardActions>
            <Button size="small" onClick={onClick}>
              Restart and upgrade
            </Button>
          </CardActions>
        </Card>
      </Box>
    );
  }
);

const UpdateModal = observer(() => {
  const { tabPageStore } = useStore();

  const [now, setNow] = useState(0);

  const dismissLengthHours = 12;

  let showModal = tabPageStore.updateDownloaded;

  if (tabPageStore.dismissedUpdateModalTime) {
    const msDiff = now - tabPageStore.dismissedUpdateModalTime.getTime();
    const secondsDiff = msDiff / 1000;
    const minuteDiff = secondsDiff / 60;
    const hoursAgo = minuteDiff / 60;

    if (hoursAgo < dismissLengthHours) {
      showModal = false;
    }
  }

  useEffect(() => {
    setNow(Date.now());
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 10000);
    return () => {
      clearInterval(interval);
    };
  }, []);

  return showModal ? (
    <UpdateModalBackground>
      <UpdateModalContent
        onClick={() => {
          ipcRenderer.send('update-and-restart');
        }}
        onClose={() => {
          runInAction(() => {
            tabPageStore.dismissedUpdateModalTime = new Date();
          });
        }}
      />
    </UpdateModalBackground>
  ) : null;
});

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
            ipcRenderer.send('click-header');
          }
        }}
      >
        <ContentParent style={contentStyle}>
          <Content />
          <HistoryModal />
          <DebugModal />
          <SettingsModal />
          <FloatingButtons />
          <UpdateModal />
        </ContentParent>
      </Background>
    </ThemeProvider>
  );
});

export default Home;
