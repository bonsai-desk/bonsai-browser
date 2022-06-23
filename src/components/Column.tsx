import styled from 'styled-components';
// import { ipcRenderer } from 'electron';
import { Grid, Paper } from '@mui/material';
import React from 'react';
import { clamp, useWindowSize } from '../utils/utils';

export const HomeTitle = styled.div`
  width: calc(100% - 36px);
  height: 90px;
  margin: 0 0 0 36px;
  display: flex;
  flex-wrap: wrap;
  align-content: center;
  overflow: hidden;
`;
export const InfoColumn = styled(Grid)`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  overflow: hidden;
  padding: 1rem;
  flex-grow: 1;
`;
export const MainColumn = styled(Grid)`
  //background-color: var(--canvas-color);
  //background-color: red;
  flex-grow: 1;
  overflow: hidden;
`;

export const ColumnContainer = ({
  Header,
  Left,
  Right,
  MiniColumn,
}: {
  Header: React.ReactNode;
  MiniColumn?: React.ReactNode;
  Left: React.ReactNode;
  Right?: React.ReactNode;
}) => {
  const { width: windowWidth } = useWindowSize();

  const defaultWidth = 260;

  const infoWidth = !windowWidth
    ? defaultWidth
    : Math.round(clamp((2 / 12) * windowWidth, defaultWidth, 2 * defaultWidth));

  const hideRightColumn = windowWidth ? windowWidth < 700 : false;

  return (
    <Grid
      container
      spacing={0}
      sx={{
        flexGrow: '1',
        height: 0,
        backgroundColor: 'var(--background-minus-2)',
      }}
    >
      {MiniColumn ? (
        <MainColumn item xs="auto">
          {MiniColumn}
        </MainColumn>
      ) : null}

      <MainColumn item xs>
        <Paper
          sx={{
            display: 'flex',
            flexDirection: 'column',
            flexGrow: 1,
            height: '100%',
          }}
        >
          <HomeTitle>{Header}</HomeTitle>
          {Left}
        </Paper>
      </MainColumn>
      {hideRightColumn || !Right ? null : (
        <InfoColumn item xs minWidth={infoWidth} maxWidth={infoWidth}>
          {Right}
        </InfoColumn>
      )}
    </Grid>
  );
};
