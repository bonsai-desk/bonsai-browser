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
        background-color: rgba(0, 0, 0, 0.7);
      `;
    }
    return '';
  }}
`;

export default Background;
