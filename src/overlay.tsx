import React from 'react';
import { observer } from 'mobx-react-lite';
import { createGlobalStyle } from 'styled-components';

const GlobalStyle = createGlobalStyle`
  html,
  body {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    //background-color: rgba(1, 0, 0, 0.5);
    -webkit-app-region: drag;
  }
`;

const Overlay = observer(() => {
  return (
    <>
      <GlobalStyle />
    </>
  );
});

export default Overlay;
