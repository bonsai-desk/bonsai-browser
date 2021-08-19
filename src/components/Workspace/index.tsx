import styled from 'styled-components';
import MainItem from './MainItem';
import MainGroup from './MainGroup';

export { MainItem, MainGroup };

export const Background = styled.div`
  user-select: none;
  flex-grow: 1;
  background-color: white;
  border-radius: 10px;
  position: relative;
  overflow: hidden;
`;
export const Trash = styled.div`
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100px;
  height: 100px;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000001;
  border-radius: 0 20px 0 0;
`;
export const TrashIcon = styled.img`
  width: 75px;
`;
