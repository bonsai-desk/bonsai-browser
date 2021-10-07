import styled, { css } from 'styled-components';
import { myPlatform, Platform } from '../render-constants';

const Background = styled.div`
  width: 100vw;
  height: 100vh;
  margin: 0;
  overflow: hidden;
  ${() => {
    if (myPlatform !== Platform.Mac) {
      return css`
        //background-color: rgba(100, 100, 100, 0.8);
      `;
    }
    return '';
  }}
`;

export default Background;
