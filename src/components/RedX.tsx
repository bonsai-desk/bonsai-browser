import styled from 'styled-components';

const RedX = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-content: center;
  justify-content: center;
  transition-duration: 0.25s;
  border-radius: 999px;
  position: absolute;
  width: 30px;
  height: 30px;
  background: rgba(200, 200, 200, 0.7);
  :hover {
    transition-duration: 0s;
    background-color: ${({ hoverColor }: { hoverColor: string }) => hoverColor};
  }
`;

export default RedX;
