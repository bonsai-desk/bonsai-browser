import { observer } from 'mobx-react-lite';
import React from 'react';
import styled from 'styled-components';
import GenericModal from './GenericModal';
import { useStore, View } from '../store/tab-page-store';

const Settings = styled.div`
  color: rgb(50, 50, 50);
`;

const Title = styled.div`
  font-size: 2rem;
  font-weight: bold;
`;

const SubTitle = styled.div`
  color: rgb(50, 50, 50);
  //font-size: 2rem;
  font-weight: bold;
`;

const SettingsSection = styled.div`
  margin: 1rem 0 0 0;
`;

const SettingsModal = observer(() => {
  const { tabPageStore } = useStore();
  return (
    <GenericModal view={View.Settings}>
      <Settings>
        <Title>Settings</Title>
        <SettingsSection>
          <SubTitle>Key Binds</SubTitle>
          <div>Option+Space: Toggle app</div>
        </SettingsSection>
        <SettingsSection>
          <SubTitle>Key Binds</SubTitle>
          <div>Tab: Toggle workspace</div>
          <div>Esc: Back/Exit</div>
          <div>Arrows: Select page in fuzzy search</div>
        </SettingsSection>
      </Settings>
      {tabPageStore.keys.map((key) => (
        // eslint-disable-next-line react/jsx-key
        <div>{key}</div>
      ))}
    </GenericModal>
  );
});

export default SettingsModal;
