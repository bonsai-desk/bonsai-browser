import React, { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import styled, { createGlobalStyle, css } from 'styled-components';
import arrowIcon from '../assets/chevron-right-arrow.svg';
import xIcon from '../assets/x-letter-black.svg';
import { ipcRenderer } from 'electron';
import { makeAutoObservable } from 'mobx';

const GlobalStyle = createGlobalStyle`
  html,
  body {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
  }
`;

const FindFull = styled.div`
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  user-select: none;
  font-family: sans-serif;
`;

const FindBox = styled.div`
  background-color: white;
  width: 98%;
  height: 88%;
  box-shadow: 0 0 5px 0 rgba(0, 0, 0, 0.2);
  border-radius: 10px;
  display: flex;
  align-items: center;
`;

const SearchBox = styled.input`
  height: 70%;
  width: 10px;
  padding-left: 15px;
  padding-right: 10px;
  border: none;
  outline: none;
  flex-grow: 1;
`;

interface ButtonRotation {
  rotation: string;
}

const IconButton = styled.div`
  width: 30px;
  height: 30px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 50%;
  margin-left: 5px;

  :active {
    background-color: gray;
  }

  ${({ rotation }: ButtonRotation) =>
    css`
      transform: rotate(${rotation}deg);
    `}
`;

interface ExtraCSS {
  extraCSS: string;
}

const UpIcon = styled.img`
  -webkit-user-drag: none;

  ${({ extraCSS }: ExtraCSS) =>
    css`
      ${extraCSS};
    `}
`;

const Results = styled.div`
  height: 30px;
  line-height: 30px;
  border-right: 1px solid lightgrey;
  padding-right: 15px;
  text-align: center;
  font-size: 14px;
  color: grey;
`;

class FindStore {
  current = 0;

  numResults = 0;

  constructor() {
    makeAutoObservable(this);
    ipcRenderer.on('find-results', (_, [current, numResults]) => {
      this.current = current;
      this.numResults = numResults;
    });
  }
}

const findStore = new FindStore();

const Find = observer(() => {
  const textBoxRef = useRef<HTMLInputElement>(null);

  const [hasRunOnce, setHasRunOnce] = useState(false);
  const [boxText, setBoxText] = useState('');

  useEffect(() => {
    if (hasRunOnce) {
      return;
    }
    setHasRunOnce(true);
    ipcRenderer.on('open-find', () => {
      if (textBoxRef.current !== null) {
        textBoxRef.current.select();
      }
    });
  }, [hasRunOnce]);

  return (
    <>
      <GlobalStyle />
      <FindFull>
        <FindBox>
          <SearchBox
            type="input"
            ref={textBoxRef}
            value={boxText}
            onInput={(e) => {
              setBoxText(e.currentTarget.value);
              ipcRenderer.send('find-text-change', e.currentTarget.value);
            }}
          />
          <Results>
            {boxText === ''
              ? ''
              : `${findStore.current}/${findStore.numResults}`}
          </Results>
          <IconButton
            rotation="-90"
            onClick={() => {
              ipcRenderer.send('find-previous');
            }}
          >
            <UpIcon src={arrowIcon} extraCSS="" />
          </IconButton>
          <IconButton
            rotation="90"
            onClick={() => {
              ipcRenderer.send('find-next');
            }}
          >
            <UpIcon src={arrowIcon} extraCSS="" />
          </IconButton>
          <IconButton
            rotation="0"
            onClick={() => {
              ipcRenderer.send('close-find');
            }}
          >
            <UpIcon src={xIcon} extraCSS="width: 50px; height: 50px" />
          </IconButton>
        </FindBox>
      </FindFull>
    </>
  );
});

export default Find;
