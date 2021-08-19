import { observer } from 'mobx-react-lite';
import React from 'react';
import styled from 'styled-components';
import { useStore, View } from '../store/tab-page-store';

export const ClickerParent = styled.div`
  position: absolute;
  height: 100vh;
  width: 100vw;
`;
export const Clicker = observer(() => {
  const { tabPageStore } = useStore();
  return (
    <ClickerParent
      onClick={() => {
        tabPageStore.View = View.Tabs;
      }}
    />
  );
});
