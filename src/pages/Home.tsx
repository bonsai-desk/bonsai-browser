import React, { useCallback, useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { ipcRenderer } from 'electron';
import { runInAction } from 'mobx';
import styled from 'styled-components';
import { useStore, View } from '../store/tab-page-store';
import URLBox from '../components/URLBox';
import FuzzyTabs from '../components/FuzzyTabs';
import ClickerParent from '../components/Clicker';
import Background from '../components/Background';
import History from '../components/History';
import Columns from '../components/Columns';
import Footer from '../components/Footer';
import Container from '../components/Container';
import Workspace from '../components/Workspace';
import Navigator from '../components/Navigator';
import NavigatorDebug from '../components/NavigatorDebug';
import {
  HistoryModal,
  HistoryModalBackground,
  HistoryModalParent,
} from '../components/History/style';

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

  if (tabPageStore.View !== View.NavigatorDebug) {
    return <div />;
  }

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

const Canvas = styled.canvas`
  position: absolute;
  z-index: -1;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
`;

function useWindowSize(
  w: number,
  h: number
): { width: number; height: number } {
  // Initialize state with undefined width/height so server and client renders match
  // Learn more here: https://joshwcomeau.com/react/the-perils-of-rehydration/
  const [windowSize, setWindowSize] = useState({
    width: w,
    height: h,
  });
  useEffect(() => {
    // Handler to call on window resize
    function handleResize() {
      // Set window width/height to state
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }
    // Add event listener
    window.addEventListener('resize', handleResize);
    // Call handler right away so state gets updated with initial window size
    handleResize();
    // Remove event listener on cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []); // Empty array ensures that effect is only run on mount
  return windowSize;
}

function paintVignette(
  ws: { width: number; height: number },
  canvas: HTMLCanvasElement
) {
  const context = canvas.getContext('2d');
  if (context) {
    const { width } = ws;
    canvas.width = width;
    const { height } = ws;
    canvas.height = height;

    const x = 0;
    const y = 0;

    context.strokeStyle = '#d2eefc';
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + width, y);
    context.lineTo(x + width, y + height);
    context.lineTo(x, y + height);
    context.lineTo(x, y);
    context.closePath();

    context.filter = 'blur(100px)';
    context.lineWidth = 500;
    context.stroke();
  }
}

const Home = observer(() => {
  const { tabPageStore } = useStore();

  const ws = useWindowSize(window.innerWidth, window.innerHeight);

  const canvasRef = useCallback(
    (node: HTMLCanvasElement) => {
      if (node !== null) {
        paintVignette(ws, node);
      }
    },
    [ws]
  );

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      tabPageStore.handleKeyDown(e);
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [tabPageStore]);

  return (
    <Background
      onClick={(e) => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        if (e.target.id === 'header' || e.target.id === 'footer') {
          tabPageStore.View = View.Tabs;
        }
      }}
    >
      <Content />
      <History />
      <Debug />
      {/* <PinButton /> */}
      <Canvas ref={canvasRef} />
    </Background>
  );
});

export default Home;
