import styled from 'styled-components';
import { observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';
import React from 'react';
import { useStore, View } from '../store/tab-page-store';
import { HistoryButton } from './History';

const FooterParent = styled.div`
  width: 100%;
  height: 85px;
  display: flex;
  justify-content: center;
  align-items: center;
`;
const FooterButtonParent = styled.button`
  border: none;
  outline: none;
  width: 75px;
  height: 75px;
  border-radius: 50%;

  :hover {
    background-color: lightgray;
  }
`;
const Footer = observer(() => {
  const { tabPageStore } = useStore();
  return (
    <FooterParent>
      <FooterButtonParent
        onClick={() => {
          runInAction(() => {
            if (tabPageStore.View === View.Tabs) {
              tabPageStore.View = View.WorkSpace;
            } else if (tabPageStore.View === View.WorkSpace) {
              tabPageStore.View = View.Tabs;
            }
          });
        }}
      >
        WorkSpace
      </FooterButtonParent>
      <HistoryButton />
    </FooterParent>
  );
});

export default Footer;
