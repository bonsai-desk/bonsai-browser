import React, { useCallback, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { ipcRenderer } from 'electron';
import { runInAction } from 'mobx';
import styled, { css } from 'styled-components';
import { useStore, View } from '../store/tab-page-store';
import Header from '../components/URLBox';
import FuzzyTabs from '../components/FuzzyTabs';
import ClickerParent from '../components/Clicker';
import Background from '../components/Background';
import HistoryModal from '../components/History';
import Columns from '../components/Columns';
import Footer from '../components/Footer';
import Container from '../components/Container';
import Workspace from '../components/Workspace';
import Navigator, { clickMain } from '../components/Navigator';
import NavigatorDebug from '../components/NavigatorDebug';
import redX from '../../assets/x-letter.svg';
import home from '../../assets/home.svg';
import GenericModal from '../components/GenericModal';
import SettingsModal from '../components/SettingsModal';
import GlobalStyle from '../GlobalStyle';

// const THEME_DARK = {
//   'link-color': '#2399E7',
//   'highlight-color': '#FBBE63',
//   'text-highlight-color': '#FBBE63',
//   'warning-color': '#DE3C21',
//   'confirmation-color': '#189E36',
//   'header-text-color': '#BABABA',
//   'body-text-color': '#AAAAAA',
//   'border-color': 'hsla(32, 81%, 90%, 0.08)',
//   'background-minus-1': '#151515',
//   'background-minus-2': '#111',
//   'background-color': '#1A1A1A',
//   'background-plus-1': '#222',
//   'background-plus-2': '#333',
//   'graph-control-bg': '#272727',
//   'graph-control-color': 'white',
//   'graph-node-normal': '#909090',
//   'graph-node-hlt': '#FBBE63',
//   'graph-link-normal': '#323232',
//   'error-color': '#fd5243',
// };

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
  return <Columns />;
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
      <NavigatorDebug />
    </GenericModal>
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
    const grd = context.createLinearGradient(0, 0, canvas.width, canvas.height);

    grd.addColorStop(0, 'rgb(76,89,199)');
    grd.addColorStop(1, 'rgb(97,151,219)');

    // grd.addColorStop(0, 'rgb(76,89,199)');
    // grd.addColorStop(1, 'rgb(0,0,0)');
    context.fillStyle = grd;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
}

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

  if (tabPageStore.windowFloating) {
    return <FloatingShadow />;
  }

  return (
    <Background
      onClick={(e) => {
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
      <GlobalStyle />
      <BackHomeButton />
      <Content />
      <HistoryModal />
      <DebugModal />
      <SettingsModal />
      <Canvas ref={canvasRef} />
    </Background>
  );
});

export default Home;
