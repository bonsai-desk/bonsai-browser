import React, { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import styled, { createGlobalStyle, css } from 'styled-components';
import arrowIcon from '../assets/chevron-right-arrow.svg';
import xIcon from '../assets/x-letter-black.svg';
import { ipcRenderer } from 'electron';

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
  width: 150px;
  padding-left: 15px;
  padding-right: 15px;
  flex-shrink: 0;
  border: none;
  border-right: 1px solid lightgrey;
  outline: none;
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
          <IconButton rotation="-90">
            <UpIcon src={arrowIcon} extraCSS="" />
          </IconButton>
          <IconButton rotation="90">
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
