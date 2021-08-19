import styled, { css } from 'styled-components';
import { ipcRenderer } from 'electron';
import React, { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { myPlatform, Platform } from '../../render-constants';
import { useStore } from '../../store/tab-page-store';

const URLBoxParent = styled.div`
  display: flex;
  justify-content: center;
  width: 100%;
`;

const Input = styled.input`
  ${() => {
    if (myPlatform === Platform.Windows) {
      return css`
        background-color: rgba(255, 255, 255, 0.25);
      `;
    }
    return '';
  }}
  font-size: 1.25rem;
  font-weight: normal;
  border-radius: 10px;
  outline: none;
  border: none;
  padding: 0.75rem 1.25rem 0.75rem 1.25rem;
  margin: 10px;
  width: 30rem;
`;

const URLBox = observer(() => {
  const { tabPageStore } = useStore();

  const urlBoxRef = useRef<HTMLInputElement>(null);
  const [urlFocus, setUrlFocus] = useState(false);

  useEffect(() => {
    tabPageStore.urlBoxRef = urlBoxRef;
  });
  return (
    <URLBoxParent>
      <Input
        type="text"
        spellCheck={false}
        ref={urlBoxRef}
        placeholder="Search Google or type a URL"
        value={tabPageStore.urlText}
        onInput={(e) => {
          tabPageStore.setUrlText(e.currentTarget.value);
        }}
        onKeyDown={(e) => {
          if (e.nativeEvent.code === 'Enter') {
            ipcRenderer.send('search-url', tabPageStore.urlText);
            tabPageStore.setUrlText('');
          }
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
    </URLBoxParent>
  );
});

export default URLBox;
