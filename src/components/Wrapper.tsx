import styled, { css } from 'styled-components';
import { myPlatform, Platform } from '../render-constants';

const Wrapper = styled.div`
  width: 100vw;
  height: 100vh;
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    ${() => {
      if (myPlatform === Platform.Mac) {
        return css`
          @media (prefers-color-scheme: dark) {
            background-color: rgba(0, 0, 0, 0);
          }
          @media (prefers-color-scheme: light) {
            background-color: rgba(0, 0, 0, 0);
          }
        `;
      }
      return css`
        background-color: rgba(0, 0, 0, 0.7);
      `;
    }}}
`;

export default Wrapper;
