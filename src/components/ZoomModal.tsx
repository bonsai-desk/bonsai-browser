import styled from 'styled-components';
import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { ipcRenderer } from 'electron';
import { Button, IconButton, Paper, Stack, Typography } from '@mui/material';
import { Add, Remove } from '@mui/icons-material';
import { useStore } from '../store/tab-page-store';
import { headerHeight } from '../constants';

const Background = styled(Paper)`
  position: absolute;
  background-color: red;
  z-index: 10000000000;
`;

const ZoomModal = observer(() => {
  const { tabPageStore } = useStore();

  const [isEnabled, setIsEnabled] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [mouseOver, setMouseOver] = useState(false);

  const padding = 28;
  const height = headerHeight - padding;

  let zoom = 100;
  const tab = tabPageStore.openTabs[tabPageStore.activeTabId];
  if (tab) {
    zoom = Math.round(tab.zoomFactor * 100);
  }

  useEffect(() => {
    function closeZoomModal() {
      setIsEnabled(false);
      setShowModal(false);

      setMouseOver(false);
    }

    ipcRenderer.on('close-zoom-modal', closeZoomModal);

    return () => {
      ipcRenderer.removeListener('close-zoom-modal', closeZoomModal);
    };
  }, []);

  useEffect(() => {
    if (!mouseOver) {
      setIsEnabled(true);
      setShowModal(true);

      const timeout = setTimeout(() => {
        setIsEnabled(false);
      }, 1500);

      return () => {
        clearTimeout(timeout);
      };
    }

    return () => {};
  }, [tabPageStore.setZoomTime, mouseOver]);

  useEffect(() => {
    if (!isEnabled) {
      const timeout = setTimeout(() => {
        setShowModal(false);
      }, 200);

      return () => {
        clearTimeout(timeout);
      };
    }

    return () => {};
  }, [isEnabled]);

  return (
    <Background
      style={{
        right: 25,
        top: padding / 2,
        height,
        display: showModal ? 'flex' : 'none',
        opacity: isEnabled ? 1 : 0,
        transition: isEnabled
          ? 'opacity 0.1s ease-out 0s'
          : 'opacity 0.2s ease-out 0s',
      }}
      onMouseOver={() => {
        setMouseOver(true);
      }}
      onMouseOut={() => {
        setMouseOver(false);
      }}
    >
      <Stack direction="row" alignItems="center">
        <Typography
          style={{ width: 50, marginLeft: 10 }}
        >{`${zoom}%`}</Typography>
        <IconButton
          onClick={() => {
            ipcRenderer.send('zoom-out');
          }}
        >
          <Remove />
        </IconButton>
        <IconButton
          onClick={() => {
            ipcRenderer.send('zoom-in');
          }}
        >
          <Add />
        </IconButton>
        <Button
          onClick={() => {
            ipcRenderer.send('reset-zoom');
          }}
        >
          Reset
        </Button>
      </Stack>
    </Background>
  );
});

export default ZoomModal;
