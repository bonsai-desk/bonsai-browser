import styled, { css } from 'styled-components';
import { myPlatform, Platform } from '../../render-constants';

export const URLBoxParent = styled.div`
  display: flex;
  justify-content: center;
  width: 100%;
`;
export const URLBox = styled.input`
  ${() => {
    if (myPlatform === Platform.Windows) {
      return css`
        background-color: rgba(255, 255, 255, 0.25);
      `;
    }
    return '';
  }}
  font-size: 1.25rem;
  font-weight: normal;
  border-radius: 10px;
  outline: none;
  border: none;
  padding: 0.75rem 1.25rem 0.75rem 1.25rem;
  margin: 10px;
  width: 30rem;
`;
