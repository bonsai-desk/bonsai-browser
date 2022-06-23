import React from 'react';
import { observer } from 'mobx-react-lite';
import styled from 'styled-components';
import { ipcRenderer } from 'electron';
import { makeAutoObservable } from 'mobx';

const UrlPeekFull = styled.div`
  width: calc(100% - 10px);
  height: 100vh;
  display: flex;
`;

const UrlText = styled.div`
  font-family: sans-serif;
  background-color: #3179bd;
  white-space: nowrap;
  overflow: hidden;
  text-align: left;
  line-height: 20px;
  text-overflow: ellipsis;
  font-size: 13px;
  padding-left: 5px;
  padding-right: 5px;
  color: white;
  border-radius: 0 5px 0 0;
`;

class PeekStore {
  url = '';

  constructor() {
    makeAutoObservable(this);
    ipcRenderer.on('peek-url-updated', (_, url) => {
      this.url = url;
    });
  }
}

const peekStore = new PeekStore();

const UrlPeek = observer(() => {
  return (
    <UrlPeekFull>
      <UrlText>{peekStore.url}</UrlText>
    </UrlPeekFull>
  );
});

export default UrlPeek;
