// const ItemPlaceholderAndContainer = styled.div``;
// const ItemPlaceholder = styled.div`
//   position: absolute;
//   left: 0;
//   top: 0;
// `;
import styled, { css } from 'styled-components';

export const ItemContainer = styled.div`
  background-color: white;
  border-radius: 20px;
  color: rgb(50, 50, 50);
  position: absolute;
  transition: transform 0.05s ease-out, filter 0.25s;
  overflow: hidden;

  ${({ showTitle }: { showTitle: boolean }) =>
    css`
      div {
        opacity: ${showTitle ? '100' : '0'};
      }
    `};
`;
export const ItemImg = styled.img`
  height: 100%;
  width: 100%;
  object-fit: cover;
  background-color: white;

  // :(
  -webkit-user-select: none;
  -moz-user-select: none;
  user-select: none;
  -webkit-user-drag: none;
`;
export const ItemTitle = styled.div`
  background-color: rgba(0, 0, 0, 0.6);
  color: white;
  position: absolute;
  font-size: 0.9rem;
  width: calc(100% - 10px);
  height: calc(100% - 10px);
  padding: 5px;
  overflow: hidden;
  top: 0;
  left: 0;
  opacity: 0;
  transition: opacity 0.25s;
`;
export const Group = styled.div`
  border-radius: 20px;
  color: rgb(250, 250, 250);
  position: absolute;
`;
export const GroupResize = styled.div`
  width: 20px;
  height: 100%;
  position: absolute;
  top: 0;
  right: -10px;

  :hover {
    cursor: col-resize;
  }
`;
export const GroupHeader = styled.div`
  display: flex;
  align-items: center;
  overflow: hidden;
  position: relative;
  outline: none;
`;
export const HeaderText = styled.div`
  position: absolute;
  top: -2px;
  left: 0;
  width: 100%;
  padding-left: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 2rem;
  font-weight: bold;
  color: rgb(250, 250, 250);
  font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen,
    Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif;
`;
export const HeaderInput = styled.input`
  position: absolute;
  top: -4px;
  left: 0;
  width: 100%;
  padding-left: 12px;
  font-size: 2rem;
  font-weight: bold;
  outline: none;
  border: none;
  background: none;
  color: rgb(250, 250, 250);
  font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen,
    Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif;
`;
