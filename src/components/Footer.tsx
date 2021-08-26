import styled from 'styled-components';
import { observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';
import React from 'react';
import { useStore, View } from '../store/tab-page-store';
import HistoryButton from './HistoryButton';

export const NavButtonParent = styled.button`
  position: absolute;
  bottom: 0;
  right: 135px;
  width: 125px;
  height: 50px;
  border-radius: 10px;
  border: none;
  outline: none;

  :hover {
    background-color: lightgray;
  }
`;

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
  width: 100px;
  height: 75px;
  border-radius: 1rem;

  :hover {
    background-color: lightgray;
  }
`;
const Footer = observer(() => {
  const { tabPageStore } = useStore();
  return (
    <FooterParent id="footer">
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
      />
      <HistoryButton />
      <NavButtonParent
        onClick={() => {
          runInAction(() => {
            if (tabPageStore.View === View.Tabs) {
              tabPageStore.View = View.NavigatorDebug;
            } else if (tabPageStore.View === View.NavigatorDebug) {
              tabPageStore.View = View.Tabs;
            }
          });
        }}
      >
        debug
      </NavButtonParent>
    </FooterParent>
  );
});

export default Footer;
