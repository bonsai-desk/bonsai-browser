import styled from 'styled-components';
import { observer } from 'mobx-react-lite';
import { ArrowBack } from '@mui/icons-material';
import React from 'react';
import { Tooltip } from '@mui/material';
import { useStore } from '../store/tab-page-store';
import { BigButton } from './Buttons';

const BackColumnParent = styled.div`
  width: 80px;
  padding: 20px 0 0 0;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
`;
const BackColumn = observer(() => {
  const { tabPageStore, keybindStore } = useStore();

  const back = keybindStore.binds.get('go-back');
  const backString = `${back?.showCode()}`;

  return (
    <BackColumnParent>
      <Tooltip title={backString}>
        <BigButton
          className="is-active"
          onClick={() => {
            tabPageStore.navBack();
          }}
        >
          <ArrowBack />
        </BigButton>
      </Tooltip>
    </BackColumnParent>
  );
});

export default BackColumn;
