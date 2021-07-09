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
    background-color: rgba(0.25, 0.25, 0.25, 0.35);
  }
`;

const MainWindow = observer(() => {
  return (
    <>
      <GlobalStyle />
    </>
  );
});

export default MainWindow;
