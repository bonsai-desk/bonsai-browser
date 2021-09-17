import { observer } from 'mobx-react-lite';
import React from 'react';
import styled from 'styled-components';
import { runInAction } from 'mobx';
import GenericModal from './GenericModal';
import { useStore, View } from '../store/tab-page-store';
import MiniGenericModal from './MiniGenericModal';
import '../index.css';
import { StretchButton, Button, BlueButton, ButtonBase } from './StretchButton';
import refreshIcon from '../../assets/refresh.svg';
import { bindEquals, showKeys } from '../store/keybinds';

const SettingsParent = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-content: center;
  justify-content: center;
`;

const Settings = styled.div`
  color: rgb(50, 50, 50);
  width: 50rem;
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 10px;
  padding: 1rem;
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

export interface IRebindModal {
  active: boolean;
  closeCallback?: () => void;
}

const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  //background-color: blue;
  width: 100%;

  #button + #button {
    margin: 0 0 0 0.5rem;
  }
`;

const RebindContainer = styled.div`
  width: 40rem;
  height: 20rem;
  display: flex;
  flex-wrap: wrap;
  align-content: space-between;
`;

const KeyBindBox = styled.div`
  position: relative;
  display: flex;
  flex-wrap: wrap;
  font-weight: bold;
  background-color: rgba(0, 0, 0, 0.05);
  padding: 0 1rem 0 1rem;
  border-radius: 10px;
  width: 15rem;
  height: 3.5rem;
  align-content: center;
`;

const ResetButton = styled(ButtonBase)`
  position: absolute;
  right: -2.5rem;
  top: 0.75rem;
  height: 2rem;
  width: 2rem;
  border-radius: 50%;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-content: center;
`;

const ResetButtonIcon = styled.img`
  -webkit-user-drag: none;
`;

const RebindModal = observer(({ active }: IRebindModal) => {
  const { tabPageStore, keybindStore } = useStore();
  const id = tabPageStore.rebindModalId;
  const bind = keybindStore.binds.get(id);
  const bindKeys =
    tabPageStore.bindKeys.length > 0 ? tabPageStore.bindKeys : ['???'];
  const bindIsDefault = bind ? bindEquals(bindKeys, bind.defaultBind) : true;
  return (
    <MiniGenericModal active={active}>
      <RebindContainer>
        <Row>
          <Title>Shortcut: {bind ? bind.name : '?'}</Title>
        </Row>
        <Row style={{ justifyContent: 'center' }}>
          <div>
            <KeyBindBox>
              {showKeys(bindKeys)}
              <ResetButton style={{ opacity: bindIsDefault ? '20%' : '100%' }}>
                <ResetButtonIcon
                  onClick={() => {
                    runInAction(() => {
                      if (bind) {
                        tabPageStore.bindKeys = bind.defaultBind;
                      }
                    });
                  }}
                  src={refreshIcon}
                />
              </ResetButton>
            </KeyBindBox>
          </div>
        </Row>
        <Row style={{ justifyContent: 'flex-end' }}>
          <Button
            id="button"
            onClick={() => {
              runInAction(() => {
                tabPageStore.rebindModalId = '';
              });
            }}
          >
            Cancel
          </Button>
          <BlueButton
            onClick={() => {
              runInAction(() => {
                bind?.setCurrentBind(tabPageStore.bindKeys);
                keybindStore.saveSnapshot();
                tabPageStore.rebindModalId = '';
              });
            }}
            id="button"
          >
            Ok
          </BlueButton>
        </Row>
      </RebindContainer>
    </MiniGenericModal>
  );
});

interface IKeyBindButton {
  id: string;
}

const KeyBindButton = observer(({ id }: IKeyBindButton) => {
  const { tabPageStore, keybindStore } = useStore();
  // ipcRenderer.send('log-data', id);
  // ipcRenderer.send(
  //   'log-data',
  //   getSnapshot(keybindStore.binds.get('floaty-window'))
  // );

  const bind = keybindStore.binds.get(id);

  // ipcRenderer.send('log-data', getSnapshot(bind));
  // const code = bind ? bind.currentBind : '?';
  return (
    <StretchButton
      onClick={() => {
        runInAction(() => {
          tabPageStore.rebindModalId = id;
          tabPageStore.bindKeys = bind ? bind.currentBind : [];
        });
      }}
    >
      {bind?.showCode()}
    </StretchButton>
  );
});

const SettingsModal = observer(() => {
  const { tabPageStore } = useStore();
  return (
    <>
      <GenericModal view={View.Settings}>
        <SettingsParent>
          <Settings>
            <Title>Settings</Title>
            <div>
              Toggle floating window{' '}
              <KeyBindButton id="toggle-floating-window" />
            </div>
            <div>
              Toggle app <KeyBindButton id="toggle-app" />
            </div>
            <div>asdfa sdf asdf asd fas df asdf asdf</div>
            <div>asdfa sdf asdf asd fas df asdf asdf</div>
            <div>
              Some text <StretchButton>asdf</StretchButton> and more.
            </div>
            <div>
              Some text <StretchButton>asdf</StretchButton> and more.
            </div>

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
        </SettingsParent>
      </GenericModal>

      <RebindModal active={!!tabPageStore.rebindModalId} />
    </>
  );
});

export default SettingsModal;
