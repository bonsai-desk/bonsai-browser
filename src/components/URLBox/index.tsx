import styled from 'styled-components';
import React, { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';
import { MoreHoriz } from '@material-ui/icons';
import { Stack } from '@material-ui/core';
import { ipcRenderer } from 'electron';
import { Style } from '@mui/icons-material';
import { Badge, Tooltip } from '@mui/material';
import { useStore } from '../../store/tab-page-store';
import { BigButton } from '../Buttons';
import TagButton from '../../watermelon/components/TagButton';
import { baseUrl } from '../../utils/utils';
import { FLOATING_BORDER_THICKNESS, View } from '../../constants';

const BonsaiBoxParent = styled.div`
  display: flex;
  justify-content: center;
  width: 100%;
  align-items: center;
  flex-shrink: 0;
`;

const Input = styled.input`
  background-color: rgba(0, 0, 0, 0.25);
  transition-duration: 0.05s;
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
  const { tabPageStore, historyStore } = useStore();

  const bonsaiBoxRef = useRef<HTMLInputElement>(null);
  const [bonsaiBoxFocus, setBonsaiBoxFocus] = useState(false);

  useEffect(() => {
    runInAction(() => {
      tabPageStore.bonsaiBoxRef = bonsaiBoxRef;
    });
  });

  const activeStyle = {
    outline: 'var(--link-color) solid 2px',
    backgroundColor: 'white',
    color: 'black',
  };

  const topPadding = tabPageStore.windowFloating
    ? FLOATING_BORDER_THICKNESS
    : 0;

  const tab = tabPageStore.openTabs[historyStore.active];
  let tabBaseUrl = '';
  if (tab) {
    tabBaseUrl = baseUrl(tab.url);
  }

  return (
    <BonsaiBoxParent
      id="header"
      style={{
        // position: onViewPage ? 'absolute' : 'static',
        top: onViewPage ? '0' : 'auto',
        zIndex: onViewPage ? 1 : 'auto',
        height:
          tabPageStore.innerBounds.y - tabPageStore.topPadding - topPadding,
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
          <Badge
            color="error"
            overlap="circular"
            badgeContent="•"
            sx={{ pointerEvents: 'none' }}
            invisible={!tabPageStore.updateDownloaded}
          >
            <BigButton
              style={{ pointerEvents: 'auto' }}
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
          </Badge>
        </div>
        <Input
          className="mousetrap"
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
        <TagButton
          pageUrl={tabBaseUrl}
          onClick={() => {
            ipcRenderer.send('open-tag-modal');
          }}
        />
        <div>
          <Tooltip title="All Tags">
            <BigButton
              className="is-active"
              onClick={() => {
                ipcRenderer.send('click-main');
                runInAction(() => {
                  tabPageStore.View = View.AllTagsView;
                });
              }}
            >
              <Style />
            </BigButton>
          </Tooltip>
        </div>
      </Stack>
    </BonsaiBoxParent>
  );
});

export default Header;
