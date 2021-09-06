import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import BonsaiLogoImg from '../../assets/bonsai-logo.svg';
import BonsaiLogoExcitedImg from '../../assets/bonsai-logo-excited.svg';
import BonsaiFocusedImg from '../../assets/bonsai-focused.svg';

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
  const pageText = [
    <div key={1} style={{ textAlign: 'end', width: '100%' }}>
      Is a dashboard web browser
    </div>,
    <div key="even-fullscreen" style={{ width: '100%', textAlign: 'end' }}>
      <div>You can bring it up anywhere</div>
      <div style={{}}>even in fullscreen</div>
    </div>,
    <div style={{ textAlign: 'center' }} key={3}>
      Press ⌥ <kbd>(Option)</kbd> + <kbd>Space</kbd> to toggle Bonsai
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
