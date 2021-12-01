import styled from 'styled-components';
import React, { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';
import { MoreHoriz } from '@material-ui/icons';
import { Stack } from '@material-ui/core';
import { useStore, View } from '../../store/tab-page-store';
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
`;

const Header = observer(({ onViewPage }: { onViewPage: boolean }) => {
  const { tabPageStore } = useStore();

  const urlBoxRef = useRef<HTMLInputElement>(null);
  const [urlFocus, setUrlFocus] = useState(false);

  useEffect(() => {
    tabPageStore.urlBoxRef = urlBoxRef;
  });

  const titleBarHeight = 0; // for regular window mode when it's added

  return (
    <URLBoxParent
      id="header"
      style={{
        position: onViewPage ? 'absolute' : 'static',
        top: onViewPage ? '0' : 'auto',
        zIndex: onViewPage ? 1 : 'auto',
        height: tabPageStore.innerBounds.y - titleBarHeight,
        marginTop: titleBarHeight,
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
          ref={urlBoxRef}
          placeholder="Search"
          value={tabPageStore.urlText}
          onInput={(e) => {
            tabPageStore.setUrlText(e.currentTarget.value);
          }}
          onClick={() => {
            if (urlBoxRef.current != null && !urlFocus) {
              setUrlFocus(true);
              urlBoxRef.current.select();
            }
          }}
          onBlur={() => {
            setUrlFocus(false);
            if (urlBoxRef.current != null) {
              urlBoxRef.current.blur();
              window.getSelection()?.removeAllRanges();
            }
          }}
        />
      </Stack>
    </URLBoxParent>
  );
});

export default Header;
