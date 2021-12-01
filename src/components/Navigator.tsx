/* eslint-disable react/jsx-props-no-spreading */
import React, { useRef } from 'react';
import styled from 'styled-components';
import { observer } from 'mobx-react-lite';
import { ipcRenderer } from 'electron';
import { Add } from '@material-ui/icons';
import {
  DragDropContext,
  Draggable,
  DraggableProvided,
  Droppable,
} from 'react-beautiful-dnd';
import { useStore } from '../store/tab-page-store';
import TitleBar, { RoundButton } from '../pages/App';
import { Tab, TabsParent } from './Tab';
import { TabPageTab } from '../interfaces/tab';

const NavigatorParent = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-wrap: wrap;
  align-content: center;
  justify-content: space-between;
`;

export function clickMain() {
  ipcRenderer.send('click-main');
  ipcRenderer.send('mixpanel-track', 'go to home from navigator border click');
}

interface ITabsBar {
  x: number;
  y: number;
  width: number;
}

const ButtonContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-content: center;
  margin: 0 8px 0 8px;
`;

const TabsRow = styled.div`
  display: flex;
  height: 34px;
  margin: 0 0 0 1px;
`;

interface ITabBarTab {
  active?: boolean;
  tab: TabPageTab;
  provided: DraggableProvided;
  width: number;
  tabBarInfo: { x: number; width: number };
}

export const TabBarTab = observer(
  ({ tabBarInfo, width, provided, tab, active = false }: ITabBarTab) => {
    const { style } = provided.draggableProps;
    if (style && style.transform) {
      if ('left' in style) {
        let x: number = parseInt(
          style.transform.split('(')[1].split('p')[0],
          10
        );
        const absoluteX = style.left + x;
        x = absoluteX >= tabBarInfo.x ? x : x - (absoluteX - tabBarInfo.x);
        x =
          absoluteX + width <= tabBarInfo.x + tabBarInfo.width
            ? x
            : x - absoluteX + tabBarInfo.x + tabBarInfo.width - width;
        try {
          style.transform = `translate(${x}px, 0)`;
        } catch (e) {
          // todo handle when the thing becomes readonly when you stop dragging?
          console.log(e);
        }
      }
    }

    // eslint-disable-next-line @typescript-eslint/naming-convention,no-underscore-dangle
    let _active = active;
    const { tabPageStore, historyStore } = useStore();
    let title = 'New Tab';
    if (tab) {
      title = tab.title ? tab.title : 'New Tab';
    }

    if (!active) {
      _active = parseInt(historyStore.active, 10) === tab.id;
    }

    function clickTab() {
      if (!_active) {
        ipcRenderer.send('set-tab', tab.id);
        ipcRenderer.send('mixpanel-track', 'click bar tab');
        // tabPageStore.setUrlText('');
      }
    }

    function clickClose(e: React.MouseEvent<HTMLDivElement, MouseEvent>) {
      e.stopPropagation();
      tabPageStore.closeTab(tab.id, _active);
      ipcRenderer.send('mixpanel-track', 'click remove tab in bar');
    }

    return (
      <div
        ref={provided.innerRef}
        {...provided.draggableProps}
        {...provided.dragHandleProps}
      >
        <Tab
          title={title}
          active={_active}
          width={width}
          tab={tab}
          clickTab={() => {
            clickTab();
          }}
          clickClose={(e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
            clickClose(e);
          }}
        />
      </div>
    );
  }
);
const TabsBar = observer(({ x, y, width }: ITabsBar) => {
  const { tabPageStore } = useStore();
  const tabs = tabPageStore.tabPageRow();
  let tabWidth = (width - 45) / tabs.length + 1; // tabs have 13 pixel padding -1 margin
  tabWidth = Math.min(tabWidth, 240);
  tabWidth = Math.max(tabWidth, 16);

  const roundButtonSize = 8 + 28 + 8;
  let parentWidth: string | number = (tabWidth - 1) * tabs.length;

  let numToDrop = 0;
  while (parentWidth + roundButtonSize > width) {
    parentWidth -= tabWidth - 1;
    numToDrop += 1;
  }

  // ipcRenderer.send('log-data', [parentWidth + roundButtonSize, width]);
  parentWidth = parentWidth < width ? `${parentWidth}px` : '100%';
  const TabsBarParentStyle = {
    zIndex: 1,
    borderRadius: '10px 10px 0 0',
    display: 'flex',
    backgroundColor: '#d9dde2',
    // overflow: 'hidden',
    width: parentWidth,
  };

  // ipcRenderer.send('log-data', tabWidth);

  const filteredTabs = tabs.slice(0, tabs.length - numToDrop);

  return (
    <TabsParent style={{ top: y, left: x, width: `${width}px` }}>
      <TabsRow>
        <DragDropContext
          onDragEnd={(result) => {
            tabPageStore.reorderTabs(result);
          }}
          onDragStart={(data) => {
            ipcRenderer.send('set-tab', data.draggableId);
            ipcRenderer.send('mixpanel-track', 'drag tab');
          }}
        >
          <Droppable droppableId="droppable" direction="horizontal">
            {(provided, _) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                style={TabsBarParentStyle}
              >
                {filteredTabs.map((tab, index) => (
                  <Draggable
                    key={tab.id}
                    draggableId={tab.id.toString()}
                    index={index}
                  >
                    {(provided0) => {
                      return (
                        <TabBarTab
                          tabBarInfo={{ x, width }}
                          tab={tab}
                          provided={provided0}
                          width={tabWidth}
                        />
                      );
                    }}
                  </Draggable>
                  // <Tab key={tab.id} tab={tab} />
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
        <ButtonContainer>
          <RoundButton
            onClick={() => {
              ipcRenderer.send('create-new-tab', true);
            }}
          >
            <Add />
          </RoundButton>
        </ButtonContainer>
      </TabsRow>
      <TitleBar />
    </TabsParent>
  );
});

const WebpageBackground = styled.div`
  background-color: white;
  position: absolute;
  border-radius: 20px 20px 0 0;
  box-shadow: rgba(99, 99, 99, 0.2) 0px 2px 8px 0px;
`;

const TagSideBar = styled.div`
  position: absolute;
  background-color: white;
`;

const Navigator = observer(() => {
  const backRef = useRef(null);
  const { tabPageStore } = useStore();

  return (
    <NavigatorParent
      ref={backRef}
      onClick={(e) => {
        if (backRef.current && e.target === backRef.current) {
          clickMain();
        }
      }}
    >
      <TabsBar
        x={tabPageStore.innerBounds.x}
        y={tabPageStore.innerBounds.y}
        width={tabPageStore.innerBounds.width}
      />
      <TagSideBar
        style={{
          width: tabPageStore.innerBounds.x,
          height: tabPageStore.innerBounds.height,
          top: tabPageStore.innerBounds.y,
          left: 0,
          display: 'none',
        }}
      />
      <WebpageBackground
        style={{
          width: tabPageStore.innerBounds.width,
          height: tabPageStore.innerBounds.height,
          top: tabPageStore.innerBounds.y,
          left: tabPageStore.innerBounds.x,
          display: process.platform === 'darwin' ? 'none' : 'block',
        }}
      />
    </NavigatorParent>
  );
});

export default Navigator;
