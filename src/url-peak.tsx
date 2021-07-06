import React from 'react';
import { observer } from 'mobx-react-lite';
import styled from 'styled-components';
import { ipcRenderer } from 'electron';
import { makeAutoObservable } from 'mobx';

const UrlPeakFull = styled.div`
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

class PeakStore {
  url = '';

  constructor() {
    makeAutoObservable(this);
    ipcRenderer.on('peak-url-updated', (_, url) => {
      this.url = url;
    });
  }
}

const peakStore = new PeakStore();

const UrlPeak = observer(() => {
  return (
    <UrlPeakFull>
      <UrlText>{peakStore.url}</UrlText>
    </UrlPeakFull>
  );
});

export default UrlPeak;
