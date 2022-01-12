import styled from 'styled-components';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { Paper } from '@material-ui/core';
import { useStore } from '../store/tab-page-store';
import { View } from '../constants';

const Background = styled.div``;

const PaperView = observer(
  ({
    children,
    style,
  }: {
    children: React.ReactNode | React.ReactNodeArray;
    style?: React.CSSProperties;
  }) => {
    const { tabPageStore } = useStore();

    return (
      <Background
        id="view-background"
        onClick={(e) => {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          const { id } = e.target;
          if (id === 'view-background') {
            tabPageStore.View = View.Tabs;
          }
        }}
      >
        <Paper
          style={{
            marginLeft: tabPageStore.innerBounds.x,
            width: tabPageStore.innerBounds.width,
            height: tabPageStore.innerBounds.height,
            display: 'flex',
            ...style,
          }}
        >
          {children}
        </Paper>
      </Background>
    );
  }
);

export default PaperView;
