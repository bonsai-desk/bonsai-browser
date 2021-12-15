import styled from 'styled-components';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { IconButton, Stack, Tooltip } from '@mui/material';
import { ipcRenderer } from 'electron';
import {
  ArrowDropDown,
  ArrowDropUp,
  ArrowLeft,
  ArrowRight,
} from '@mui/icons-material';
import { useStore } from '../store/tab-page-store';

const FloatingButtonsParentLeft = styled.div`
  position: absolute;
  left: 6px;
  top: 6px;
  z-index: 100;
`;

const FloatingButtonsParentRight = styled.div`
  position: absolute;
  right: 6px;
  top: 6px;
  z-index: 100;
`;

const FloatingButtons = observer(() => {
  const { tabPageStore, keybindStore } = useStore();
  const defaultValues = {
    showSnapLeft: false,
    showSnapRight: false,
    showFullscreen: false,
  };
  const [values, setValues] = useState(defaultValues);

  const sl = keybindStore.binds.get('snap-left');
  const sr = keybindStore.binds.get('snap-right');
  const to = keybindStore.binds.get('toggle-app');
  const fu = keybindStore.binds.get('fullscreen');

  const slString = `${sl?.showCode()}`;
  const srString = `${sr?.showCode()}`;
  const toString = `${to?.showCode()}`;
  const fuString = `${fu?.showCode()}`;

  const [blinkDone, setBlinkDone] = useState(false);

  useEffect(() => {
    setBlinkDone(false);
    setTimeout(() => {
      setBlinkDone(true);
    }, 10);
  }, [tabPageStore.windowFloating]);

  const RightButtons = () => {
    if (tabPageStore.windowFloating) {
      return (
        <Tooltip
          title={fuString}
          open={values.showFullscreen}
          disableHoverListener
          onMouseEnter={() => {
            setValues({ ...values, showFullscreen: true });
          }}
          onMouseLeave={() => {
            setValues({ ...values, showFullscreen: false });
          }}
        >
          <IconButton
            size="small"
            disabled={!tabPageStore.windowFloating}
            onClick={() => {
              ipcRenderer.send('unfloat-button');
              setValues(defaultValues);
            }}
          >
            <ArrowDropUp />
          </IconButton>
        </Tooltip>
      );
    }

    return (
      <>
        <Tooltip
          disableHoverListener
          title={slString}
          open={values.showSnapLeft}
          onMouseEnter={() => {
            setValues({ ...defaultValues, showSnapLeft: true });
          }}
          onMouseLeave={() => {
            setValues(defaultValues);
          }}
        >
          <IconButton
            size="small"
            onClick={() => {
              ipcRenderer.send('move-floating-window-left');
              setValues(defaultValues);
            }}
          >
            <ArrowLeft />
          </IconButton>
        </Tooltip>
        <Tooltip
          disableHoverListener
          title={srString}
          open={values.showSnapRight}
          onMouseEnter={() => {
            setValues({ ...defaultValues, showSnapRight: true });
          }}
          onMouseLeave={() => {
            setValues(defaultValues);
          }}
        >
          <IconButton
            size="small"
            onClick={() => {
              ipcRenderer.send('move-floating-window-right');
              setValues(defaultValues);
            }}
          >
            <ArrowRight />
          </IconButton>
        </Tooltip>
      </>
    );
  };

  return (
    <>
      <FloatingButtonsParentLeft>
        <Stack direction="row" alignItems="center" spacing={0}>
          <Tooltip title={toString}>
            <IconButton
              size="small"
              onClick={() => {
                ipcRenderer.send('hide-window');
              }}
            >
              <ArrowDropDown />
            </IconButton>
          </Tooltip>
        </Stack>
      </FloatingButtonsParentLeft>
      <FloatingButtonsParentRight>
        <Stack direction="row" alignItems="center" spacing={0}>
          {!blinkDone ? '' : <RightButtons />}
        </Stack>
      </FloatingButtonsParentRight>
    </>
  );
});

export default FloatingButtons;
