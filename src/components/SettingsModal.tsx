import { observer } from 'mobx-react-lite';
import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';
import { runInAction } from 'mobx';
import { Close } from '@material-ui/icons';
import { ipcRenderer } from 'electron';
import GenericModal from './GenericModal';
import { useStore, View } from '../store/tab-page-store';
import MiniGenericModal from './MiniGenericModal';
import '../index.css';
import {
  BlueButton,
  Button as BonsaiButton,
  ButtonBase,
  InertButtonStyle,
  StretchButton,
  StretchButtonInert,
} from './StretchButton';
import refreshIcon from '../../assets/refresh.svg';
import { bindEquals, globalKeybindValid, showKeys } from '../store/keybinds';
import { Buttons, ToggleButton } from './Buttons';

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
  #settings-row {
    margin: 0.4rem 0 0 0;
  }
`;

export const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
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

export const KeyBindBox = styled.div`
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

export const DynamicKeyBindBox = styled(KeyBindBox)`
  cursor: pointer;
  transition-duration: 0.1s;
  :hover {
    background-color: rgba(0, 0, 0, 0.2);
  }
`;

export const ResetButton = styled(ButtonBase)`
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

export const ResetButtonIcon = styled.img`
  -webkit-user-drag: none;
`;

const EmailError = styled.div`
  padding-left: 100px;
`;

export interface IRebindModal {
  active: boolean;
  closeCallback?: () => void;
}

const RebindModal = observer(({ active }: IRebindModal) => {
  const { tabPageStore, keybindStore } = useStore();
  const id = tabPageStore.rebindModalId;
  const bind = keybindStore.binds.get(id);
  const bindKeys =
    tabPageStore.bindKeys.length > 0 ? tabPageStore.bindKeys : ['None'];
  const bindIsDefault = bind ? bindEquals(bindKeys, bind.defaultBind) : true;
  useEffect(() => {
    if (active) {
      ipcRenderer.send('disable-hotkeys');
    }
    return () => {
      ipcRenderer.send('enable-hotkeys');
    };
  }, [active]);
  const keysValid = globalKeybindValid(bindKeys);
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
          <BonsaiButton
            id="button"
            onClick={() => {
              runInAction(() => {
                tabPageStore.rebindModalId = '';
              });
            }}
          >
            Cancel
          </BonsaiButton>
          <BlueButton
            style={keysValid ? {} : InertButtonStyle}
            onClick={() => {
              if (bind && keysValid) {
                runInAction(() => {
                  bind.setCurrentBind(tabPageStore.bindKeys);
                  keybindStore.saveSnapshot();
                  ipcRenderer.send('rebind-hotkey', {
                    hotkeyId: tabPageStore.rebindModalId,
                    newBind: [...tabPageStore.bindKeys],
                  });
                  tabPageStore.rebindModalId = '';
                });
              }
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
  clickable?: boolean;
}

const KeyBindButton = observer(({ id, clickable = false }: IKeyBindButton) => {
  const { tabPageStore, keybindStore } = useStore();
  const bind = keybindStore.binds.get(id);
  if (clickable) {
    return (
      <StretchButton
        onClick={() => {
          if (clickable) {
            runInAction(() => {
              tabPageStore.rebindModalId = id;
              tabPageStore.bindKeys = bind ? bind.currentBind : [];
            });
          }
        }}
      >
        {bind?.showCode()}
      </StretchButton>
    );
  }
  return <StretchButtonInert>{bind?.showCode()}</StretchButtonInert>;
});

function validateEmail(email: string) {
  const re =
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
}

const SettingsModal = observer(() => {
  const { tabPageStore } = useStore();

  const emailBoxRef = useRef<HTMLInputElement>(null);
  const emailErrorRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <GenericModal view={View.Settings}>
        <SettingsParent>
          <Settings>
            <Title>Settings</Title>

            <SettingsSection
              style={{
                border: tabPageStore.seenEmailForm ? 'none' : '2px solid red',
                position: 'relative',
              }}
            >
              <SubTitle>Email List</SubTitle>
              <ToggleButton
                className="is-error rounded"
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 0,
                  display: tabPageStore.seenEmailForm ? 'none' : 'inline-flex',
                }}
                onClick={() => {
                  ipcRenderer.send('dismiss-email-notification');
                }}
              >
                <Close />
              </ToggleButton>
              <div>
                Enter email:{' '}
                <input
                  type="email"
                  ref={emailBoxRef}
                  onInput={() => {
                    if (emailErrorRef.current !== null) {
                      emailErrorRef.current.innerHTML = '';
                    }
                  }}
                  onMouseDown={() => {
                    ipcRenderer.send('dismiss-email-notification');
                    if (emailErrorRef.current !== null) {
                      emailErrorRef.current.innerHTML = '';
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (
                      emailBoxRef.current !== null &&
                      emailErrorRef.current !== null
                    ) {
                      if (validateEmail(emailBoxRef.current.value)) {
                        ipcRenderer.send(
                          'set-email',
                          emailBoxRef.current.value
                        );
                        emailBoxRef.current.value = '';
                        emailErrorRef.current.innerHTML = 'email submitted';
                      } else {
                        emailErrorRef.current.innerHTML = 'invalid email';
                      }
                    }
                  }}
                >
                  Submit
                </button>
                <EmailError ref={emailErrorRef} />
              </div>
            </SettingsSection>

            <SettingsSection>
              <SubTitle>General</SubTitle>
              <div>
                Toggle app <KeyBindButton id="toggle-app" clickable />
              </div>
            </SettingsSection>

            <SettingsSection>
              <SubTitle>Web Page</SubTitle>
              <div id="settings-row">
                Search is always focused when you toggle{' '}
                <KeyBindButton id="toggle-app" /> into an active web page.
              </div>
              <div id="settings-row">
                Toggle floating window{' '}
                <KeyBindButton id="toggle-floating-window" />
              </div>
              <div id="settings-row">
                Focus search box <KeyBindButton id="select-search-box" />
              </div>
              <div id="settings-row">
                Return to tab page when search has focus{' '}
                <KeyBindButton id="hide-from-home" />
              </div>
              <div id="settings-row">
                Return to tab page <KeyBindButton id="home-from-webpage" />{' '}
              </div>
              <div id="settings-row">
                Close web page <KeyBindButton id="close-web-page" />
              </div>
            </SettingsSection>

            <SettingsSection>
              <SubTitle>Search</SubTitle>
              <div id="settings-row">
                Clear search: <KeyBindButton id="clear-fuzzy-search" />
              </div>
              <div id="settings-row">
                {' '}
                You can select results in fuzzy search with keyboard.
              </div>
              <div id="settings-row">
                Left <KeyBindButton id="fuzzy-left-arrow" /> or{' '}
                <KeyBindButton id="fuzzy-left" clickable />
              </div>
              <div id="settings-row">
                Down <KeyBindButton id="fuzzy-down-arrow" /> or{' '}
                <KeyBindButton id="fuzzy-down" clickable />
              </div>
              <div id="settings-row">
                Up <KeyBindButton id="fuzzy-up-arrow" /> or{' '}
                <KeyBindButton id="fuzzy-up" clickable />
              </div>
              <div id="settings-row">
                Right <KeyBindButton id="fuzzy-right-arrow" /> or{' '}
                <KeyBindButton id="fuzzy-right" clickable />
              </div>
              <div id="settings-row">
                Open page: <KeyBindButton id="select-fuzzy-result" />
              </div>
            </SettingsSection>

            <SettingsSection>
              <SubTitle>Home</SubTitle>
              <div>
                Toggle workspace <KeyBindButton id="toggle-workspace" />
              </div>
              <div id="settings-row">
                Hide <KeyBindButton id="hide-from-home" />
              </div>
            </SettingsSection>
          </Settings>
        </SettingsParent>
      </GenericModal>

      <RebindModal active={!!tabPageStore.rebindModalId} />
    </>
  );
});

export default SettingsModal;
