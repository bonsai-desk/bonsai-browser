import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { ipcRenderer } from 'electron';
import BonsaiLogoImg from '../../assets/bonsai-logo.svg';
import BonsaiLogoExcitedImg from '../../assets/bonsai-logo-excited.svg';
import BonsaiFocusedImg from '../../assets/bonsai-focused.svg';
import {
  KeyBindBox,
  DynamicKeyBindBox,
  ResetButton,
  ResetButtonIcon,
  Row,
} from '../components/SettingsModal';
import { bindEquals, globalKeybindValid, showKeys } from '../store/keybinds';
import refreshIcon from '../../assets/refresh.svg';
import { chord } from '../utils/utils';
import {
  Button as GrayButton,
  BlueButton,
  InertButtonStyle,
  RoundButton,
} from '../components/StretchButton';

const Header = styled.div`
  font-weight: bold;
  font-size: 2rem;
  margin: 5rem 0 1rem 0;
`;

const Slug = styled.div`
  font-weight: bold;
  font-size: 1rem;
  width: 22rem;
  margin: 3rem 0 0 0;
`;

const ButtonContainer = styled.div`
  display: flex;
  //flex-wrap: wrap;
  justify-content: flex-end;
  //background-color: red;
  position: absolute;
  bottom: 1rem;
  right: 1rem;
`;

const Button = styled.div`
  width: 10rem;
  height: 2rem;
  border-radius: 10px;
  transition-duration: 0.25s;
  background-color: #ff8400;
  filter: brightness(1);
  :hover {
    filter: brightness(0.9);
  }
  display: flex;
  flex-wrap: wrap;
  align-content: center;
  justify-content: center;
  font-weight: bold;
  color: white;
`;

const OnboardingBackground = styled.div`
  user-select: none;
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
`;

const BonsaiLogo = styled.div`
  background-image: url(${BonsaiLogoImg});
  height: 200px;
  background-repeat: no-repeat;
  background-position: center center;
`;

const BonsaiLogoExcited = styled.div`
  background-image: url(${BonsaiLogoExcitedImg});
  height: 200px;
  background-repeat: no-repeat;
  background-position: center center;
`;

const BonsaiLogoFocus = styled.div`
  background-image: url(${BonsaiFocusedImg});
  height: 200px;
  background-repeat: no-repeat;
  background-position: center center;
`;

enum Image {
  Normal,
  Excited,
  Focus,
}

const Onboarding = () => {
  const [logo, setLogo] = useState(Image.Normal);
  const [page, setPage] = useState(0);
  const [buttonEnabled, setButtonEnabled] = useState(false);
  const defaultBind = ['Alt', 'Space'];
  const [bind, setBind] = useState<string[]>(defaultBind);
  const [newBind, setNewBind] = useState<string[]>(defaultBind);
  const [rebind, setRebind] = useState(false);
  const pageText = [
    <div key={1} style={{ textAlign: 'end', width: '100%' }}>
      Is a dashboard web browser
    </div>,
    <div key="even-fullscreen" style={{ width: '100%', textAlign: 'end' }}>
      <div>You can bring it up anywhere</div>
      <div style={{}}>even in fullscreen</div>
    </div>,
    <div key={3}>
      <div
        style={{ margin: '-2rem 0 0 0', width: '100%', textAlign: 'center' }}
      >
        Toggle now with{' '}
      </div>
      <Row style={{ margin: '1rem 0 0 0', justifyContent: 'center' }}>
        <DynamicKeyBindBox
          style={{}}
          onClick={() => {
            setRebind(true);
            setNewBind(bind);
          }}
        >
          {showKeys(bind)}
        </DynamicKeyBindBox>
      </Row>
    </div>,
  ];
  const buttonEnabledStyle = { opacity: '100%' };
  const buttonDisabledStyle = { opacity: '0%' };
  useEffect(() => {
    setButtonEnabled(false);
    setTimeout(() => {
      setButtonEnabled(true);
    }, 1000);
  }, [page]);

  const bindIsDefault = bindEquals(bind, defaultBind);

  useEffect(() => {
    if (rebind) {
      ipcRenderer.send('log-data', 'disable');
      ipcRenderer.send('disable-hotkeys');
    }
    return () => {
      ipcRenderer.send('log-data', 'enable');
      ipcRenderer.send('enable-hotkeys');
    };
  }, [rebind]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (rebind) {
        e.preventDefault();
        setNewBind(chord(e));
        // ipcRenderer.send('rebind-hotkey', {
        //   hotkeyId: 'test',
        //   newBind: [...this.bindKeys],
        // });
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [rebind]);

  useEffect(() => {
    ipcRenderer.send('rebind-hotkey', {
      hotkeyId: 'toggle-app',
      newBind: bind,
    });
  }, [bind]);

  const keysValid = globalKeybindValid(newBind);
  if (rebind) {
    return (
      <OnboardingBackground>
        <div>
          <Header>Rebind Toggle App</Header>
          <Row
            style={{
              justifyContent: 'center',
              width: '30rem',
            }}
          >
            <KeyBindBox
              style={{
                margin: '4rem 0 0 0',
              }}
            >
              {showKeys(newBind)}

              <ResetButton style={{ opacity: bindIsDefault ? '20%' : '100%' }}>
                <ResetButtonIcon
                  onClick={() => {
                    setNewBind(defaultBind);
                  }}
                  src={refreshIcon}
                />
              </ResetButton>
            </KeyBindBox>
          </Row>

          <Row style={{ margin: '5rem 0 0 0', justifyContent: 'flex-end' }}>
            <GrayButton
              id="button"
              onClick={() => {
                // setBind(defaultBind);
                setRebind(false);
              }}
            >
              Cancel
            </GrayButton>
            <BlueButton
              style={keysValid ? {} : InertButtonStyle}
              onClick={() => {
                if (keysValid) {
                  setRebind(false);
                  setBind(newBind);
                }
                // if (bind && keysValid) {
                //   runInAction(() => {
                //     bind.setCurrentBind(tabPageStore.bindKeys);
                //     keybindStore.saveSnapshot();
                //     ipcRenderer.send('rebind-hotkey', {
                //       hotkeyId: tabPageStore.rebindModalId,
                //       newBind: [...tabPageStore.bindKeys],
                //     });
                //     tabPageStore.rebindModalId = '';
                //   });
                // }
              }}
              id="button"
            >
              Ok
            </BlueButton>
          </Row>
        </div>
      </OnboardingBackground>
    );
  }

  return (
    <OnboardingBackground>
      <div>
        <Header>Bonsai</Header>
        <BonsaiLogo
          style={{ display: logo === Image.Normal ? 'block' : 'none' }}
        />
        <BonsaiLogoExcited
          style={{ display: logo === Image.Excited ? 'block' : 'none' }}
        />
        <BonsaiLogoFocus
          style={{ display: logo === Image.Focus ? 'block' : 'none' }}
        />
        <Slug>{pageText[page]}</Slug>
      </div>
      {page !== pageText.length - 1 ? (
        <ButtonContainer>
          <Button
            style={buttonEnabled ? buttonEnabledStyle : buttonDisabledStyle}
            onClick={() => {
              if (buttonEnabled) {
                setPage(page + 1);
                setLogo(logo + 1);
              }
            }}
          >
            Next
          </Button>
        </ButtonContainer>
      ) : (
        ''
      )}
    </OnboardingBackground>
  );
};

export default Onboarding;
