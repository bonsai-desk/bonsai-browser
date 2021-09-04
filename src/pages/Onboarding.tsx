import React from 'react';
import styled from 'styled-components';

const OnboardingBackground = styled.div`
  background-color: white;
  width: 100vw;
  height: 100vh;
`;
const Onboarding = () => {
  return (
    <OnboardingBackground>
      <div>Press Alt+Space to toggle Bonsai Browser</div>
    </OnboardingBackground>
  );
};

export default Onboarding;
