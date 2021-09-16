import React, { useCallback, useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { ipcRenderer } from 'electron';
import { runInAction } from 'mobx';
import styled, { css } from 'styled-components';
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
import redX from '../../assets/x-letter.svg';
import home from '../../assets/home.svg';

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

  const containerContent =
    tabPageStore.View === View.Navigator ? (
      <Navigator />
    ) : (
      <>
        <MainContent />
        <Footer />
      </>
    );

  return (
    <Container>
      <URLBox onViewPage={tabPageStore.View === View.Navigator} />
      {containerContent}
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

// function paintVignette(
//   ws: { width: number; height: number },
//   canvas: HTMLCanvasElement,
//   workArea: Rectangle
// ) {
//   return;
//   const context = canvas.getContext('2d');
//   if (context) {
//     const { width } = ws;
//     canvas.width = width;
//     const { height } = ws;
//     canvas.height = height;
//
//     const sides = [
//       workArea.y,
//       ws.width - (workArea.x + workArea.width),
//       ws.height - (workArea.y + workArea.height),
//       workArea.x,
//     ];
//
//     const max = Math.max(...sides);
//
//     const x = 0;
//     const y = 0;
//
//     context.strokeStyle = 'grey';
//     context.beginPath();
//     context.moveTo(x - 500, y + height);
//     context.lineTo(x + width + 500, y + height);
//     context.closePath();
//
//     context.strokeStyle = 'darkgray';
//     context.beginPath();
//     context.moveTo(x - 500, y);
//     context.lineTo(x + width + 500, y);
//     context.closePath();
//
//     context.filter = 'blur(50px)';
//     context.lineWidth = (max + 150) * 2;
//     context.stroke();
//   }
// }

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

const Home = observer(() => {
  const { tabPageStore } = useStore();

  const ws = useWindowSize(window.innerWidth, window.innerHeight);

  const canvasRef = useCallback(
    (node: HTMLCanvasElement) => {
      if (node !== null) {
        // paintVignette(ws, node, tabPageStore.workAreaRect);
      }
    },
    [ws, tabPageStore.workAreaRect]
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

  if (tabPageStore.windowFloating) {
    return <FloatingShadow />;
  }

  return (
    <Background
      onClick={(e) => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const { id } = e.target.id;
        if (
          tabPageStore.View !== View.Tabs &&
          (id === 'header' || id === 'footer' || id === 'workspaceBackground')
        ) {
          if (tabPageStore.View === View.WorkSpace) {
            ipcRenderer.send(
              'mixpanel-track',
              'toggle off workspace with background click'
            );
          }
          tabPageStore.View = View.Tabs;
        }
      }}
    >
      <BackHomeButton />
      <Content />
      <History />
      <Debug />
      {/* <PinButton /> */}
      <Canvas ref={canvasRef} />
    </Background>
  );
});

export default Home;
