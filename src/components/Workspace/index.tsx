import React from 'react';
import styled from 'styled-components';
import { observer } from 'mobx-react-lite';

const Background = styled.div`
  flex-grow: 1;
  background-color: darkgray;
  border-radius: 10px;
`;

const Workspace = observer(() => {
  return <Background />;
});

export default Workspace;
