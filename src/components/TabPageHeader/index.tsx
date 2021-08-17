import styled, { css } from 'styled-components';

export const URLBoxParent = styled.div`
  display: flex;
  justify-content: center;
  width: calc(100% - 2px - 10px - 4px - 20px);
`;
export const URLBox = styled.input`
  ${({ windows = false }: { windows: boolean }) => {
    if (windows) {
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
