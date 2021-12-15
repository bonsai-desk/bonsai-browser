import styled from 'styled-components';
import React, { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';
import { MoreHoriz } from '@material-ui/icons';
import { Stack } from '@material-ui/core';
import { ipcRenderer } from 'electron';
import { GridView, ViewColumnOutlined } from '@mui/icons-material';
import { Tooltip } from '@mui/material';
import { TabViewType, useStore, View } from '../../store/tab-page-store';
import { BigButton } from '../Buttons';

const URLBoxParent = styled.div`
  display: flex;
  justify-content: center;
  width: 100%;
  align-items: center;
  flex-shrink: 0;
`;

const Input = styled.input`
  background-color: rgba(0, 0, 0, 0.25);
  font-size: 1rem;
  font-weight: normal;
  height: 3rem;
  border-radius: 1.5rem;
  outline: none;
  border: none;
  padding: 0 1.25rem 0 1.25rem;
  width: 20rem;
  color: white;
  ::placeholder {
    color: rgba(255, 255, 255, 0.8);
  }
  :focus {
    outline: var(--link-color) solid 2px;
    background-color: white;
    color: black;
  }
`;

const Header = observer(({ onViewPage }: { onViewPage: boolean }) => {
  const { tabPageStore } = useStore();

  const bonsaiBoxRef = useRef<HTMLInputElement>(null);
  const [bonsaiBoxFocus, setBonsaiBoxFocus] = useState(false);

  useEffect(() => {
    tabPageStore.bonsaiBoxRef = bonsaiBoxRef;
  });

  const activeStyle = {
    outline: 'var(--link-color) solid 2px',
    backgroundColor: 'white',
    color: 'black',
  };

  useEffect(() => {
    if (!tabPageStore.bonsaiBoxFocus && tabPageStore.urlText) {
      // tabPageStore.setFocus()
      tabPageStore.bonsaiBoxRef?.current?.focus();
    }
    if (tabPageStore.bonsaiBoxFocus && !tabPageStore.urlText) {
      // tabPageStore.setFocus()
      tabPageStore.bonsaiBoxRef?.current?.blur();
    }
  }, [tabPageStore.urlText]);

  return (
    <URLBoxParent
      id="header"
      style={{
        position: onViewPage ? 'absolute' : 'static',
        top: onViewPage ? '0' : 'auto',
        zIndex: onViewPage ? 1 : 'auto',
        height: tabPageStore.innerBounds.y - tabPageStore.topPadding,
        paddingTop: tabPageStore.topPadding,
      }}
      onMouseOver={() => {
        runInAction(() => {
          tabPageStore.hoveringUrlInput = true;
        });
      }}
      onMouseLeave={() => {}}
    >
      <Stack direction="row" spacing={1}>
        <div>
          <BigButton
            className="is-active"
            onClick={() => {
              if (tabPageStore.View === View.Navigator) {
                ipcRenderer.send('click-main');
              }
              runInAction(() => {
                tabPageStore.View = View.Settings;
              });
            }}
          >
            <MoreHoriz />
          </BigButton>
        </div>
        <Input
          type="text"
          spellCheck={false}
          ref={bonsaiBoxRef}
          style={tabPageStore.urlText ? activeStyle : {}}
          placeholder="Search"
          value={tabPageStore.urlText}
          onInput={(e) => {
            tabPageStore.setUrlText(e.currentTarget.value);
          }}
          onClick={() => {
            if (bonsaiBoxRef.current != null && !bonsaiBoxFocus) {
              setBonsaiBoxFocus(true);
              bonsaiBoxRef.current.select();
            }
          }}
          onFocus={() => {
            runInAction(() => {
              tabPageStore.bonsaiBoxFocus = true;
            });
          }}
          onBlur={() => {
            runInAction(() => {
              tabPageStore.bonsaiBoxFocus = false;
            });
            setBonsaiBoxFocus(false);
            if (bonsaiBoxRef.current != null) {
              bonsaiBoxRef.current.blur();
              window.getSelection()?.removeAllRanges();
            }
          }}
        />
        <div>
          <Tooltip
            title={
              tabPageStore.TabView === TabViewType.Grid
                ? 'Tab Columns'
                : 'Tab Grid'
            }
          >
            <BigButton
              className="is-active"
              onClick={() => {
                runInAction(() => {
                  if (tabPageStore.TabView === TabViewType.Grid) {
                    tabPageStore.TabView = TabViewType.Column;
                  } else {
                    tabPageStore.TabView = TabViewType.Grid;
                  }
                });
              }}
            >
              {tabPageStore.TabView === TabViewType.Column ? (
                <GridView />
              ) : (
                <ViewColumnOutlined />
              )}
            </BigButton>
          </Tooltip>
        </div>
      </Stack>
    </URLBoxParent>
  );
});

export default Header;
