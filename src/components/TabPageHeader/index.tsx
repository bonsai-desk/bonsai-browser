import styled from 'styled-components';

export const URLBoxParent = styled.div`
  display: flex;
  justify-content: center;
  width: calc(100% - 2px - 10px - 4px - 20px);
`;
export const URLBox = styled.input`
  background-color: rgba(175, 175, 175, 0.25);
  font-size: 1.25rem;
  font-weight: bold;
  border-radius: 10px;
  outline: none;
  border: none;
  //border: 2px solid white;
  padding: 0.75rem;
  margin: 10px;
  width: 30rem;
  color: rgb(250, 250, 250);

  ::placeholder {
    color: rgb(150, 150, 150);
  }
`;
