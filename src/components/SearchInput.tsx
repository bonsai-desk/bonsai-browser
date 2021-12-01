import styled from 'styled-components';
import { color } from '../utils/jsutils';

// eslint-disable-next-line import/prefer-default-export
export const SearchInputParent = styled.input`
  padding: 0 0 0 1.5rem;
  font-size: 1rem;
  color: ${color('body-text-color', 'opacity-high')};
  background-color: ${color('background-minus-2')};
  border-style: none;

  height: 3rem;
  font-weight: 600;

  border-radius: 1.5rem;
  outline-style: none;

  :focus {
    //outline: blue solid 2px;
    background-color: white;
    box-shadow: 0 0 0 2px cornflowerblue;
  }
`;
