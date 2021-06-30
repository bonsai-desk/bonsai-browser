import React from 'react';
import styled, { css } from 'styled-components';
import { observer } from 'mobx-react-lite';
import TabObject from '../../interfaces/tab';
import xIcon from '../../../assets/x-letter.svg';
import { useStore } from '../../data';

interface StyledTabParentProps {
  color: string;
}

const TabParent = styled.div`
  -webkit-app-region: no-drag;
  -webkit-user-select: none;
  -webkit-user-drag: none;
  width: 225px;
  height: calc(100% - 1px);
  border-left: 1px solid black;
  border-top: 1px solid black;
  border-right: 1px solid black;
  border-radius: 10px 10px 0 0;
  display: flex;
  flex-wrap: nowrap;

  ${({ color }: StyledTabParentProps) =>
    css`
      background-color: ${color};
    `}
`;

const TabTileParent = styled.div`
  width: calc(100% - 35px);
  display: flex;
  align-items: center;
`;

const TabTitle = styled.div`
  overflow: hidden;
  width: 100%;
  padding-left: 6px;
  color: white;
`;

const CloseButtonParent = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 35px;
`;

const XIcon = styled.img`
  width: 28px;
  -webkit-user-drag: none;
`;

interface ITab {
  tab: TabObject;
}

const Tab = observer(({ tab }: ITab) => {
  const { tabStore } = useStore();
  const active = tabStore.activeTabId === tab.id;

  const activeColor = '#8352FF';
  const defaultColor = '#489aff';

  return (
    <TabParent
      color={active ? activeColor : defaultColor}
      onMouseDown={() => {
        tabStore.setActiveTab(tab.id);
      }}
    >
      <TabTileParent>
        <TabTitle>{tab.url}</TabTitle>
      </TabTileParent>
      <CloseButtonParent>
        <XIcon
          src={xIcon}
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
          onClick={() => {
            tabStore.removeTab(tab.id);
          }}
        />
      </CloseButtonParent>
    </TabParent>
  );
});

export default Tab;
