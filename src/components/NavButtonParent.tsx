import styled from 'styled-components';

const NavButtonParent = styled.button`
  height: 50px;
  border-radius: 10px;
  border: none;
  outline: none;
  margin: 0 0 0 10px;
  padding: 0 10px 0 10px;

  font-weight: bold;
  color: white;
  transition-duration: 0.1s;
  background-color: rgba(0, 0, 0, 0.25);

  :hover {
    background-color: rgba(0, 0, 0, 0.5);
  }
`;

export default NavButtonParent;
