import styled from 'styled-components';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { IconButton, Stack } from '@mui/material';
import { ipcRenderer } from 'electron';
import {
  KeyboardDoubleArrowLeftRounded,
  KeyboardDoubleArrowRightRounded,
  SettingsOverscanRounded,
} from '@mui/icons-material';
import { useStore } from '../store/tab-page-store';

const FloatingButtonsParent = styled.div`
  position: absolute;
  right: 0;
  top: 0;
  z-index: 100;
`;

const FloatingButtons = observer(() => {
  const { tabPageStore } = useStore();

  return (
    <FloatingButtonsParent>
      <Stack direction="row" alignItems="center" spacing={0}>
        <IconButton
          size="small"
          onClick={() => {
            ipcRenderer.send('move-floating-window-left');
          }}
        >
          <KeyboardDoubleArrowLeftRounded />
        </IconButton>
        <IconButton
          size="small"
          onClick={() => {
            ipcRenderer.send('move-floating-window-right');
          }}
        >
          <KeyboardDoubleArrowRightRounded />
        </IconButton>
        <IconButton
          size="small"
          disabled={!tabPageStore.windowFloating}
          onClick={() => {
            ipcRenderer.send('unfloat-button');
          }}
        >
          <SettingsOverscanRounded />
        </IconButton>
      </Stack>
    </FloatingButtonsParent>
  );
});

export default FloatingButtons;
