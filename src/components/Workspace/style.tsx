// const ItemPlaceholderAndContainer = styled.div``;
// const ItemPlaceholder = styled.div`
//   position: absolute;
//   left: 0;
//   top: 0;
// `;
import styled, { css } from 'styled-components';

export const ItemContainer = styled.div`
  background-color: white;
  border-radius: 10px;
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
export const ItemImg = styled.div`
  height: 100%;
  width: 100%;
  object-fit: cover;

  ${({ img }: { img: string }) => {
    if (img) {
      return css`
        background-image: ${img};
        background-size: cover;
        background-repeat: no-repeat;
      `;
    }
    return 'background-color: gray;';
  }}

  // :(
  -webkit-user-select: none;
  -moz-user-select: none;
  user-select: none;
  -webkit-user-drag: none;
`;

export const ItemFaviconParent = styled.div`
  width: 32px;
  height: 32px;
  position: absolute;
  right: 0.5rem;
  bottom: 0.5rem;
  background-color: white;
  border-radius: 50%;
  display: flex;
  flex-wrap: wrap;
  align-content: center;
  justify-content: center;
`;

export const ItemFavicon = styled.div`
  position: absolute;
  --circum: 28px;
  top: 2px;
  left: 2px;
  width: var(--circum);
  height: var(--circum);
  ${({ img }: { img: string }) => {
    if (img) {
      return css`
        background-image: ${img};
        background-size: cover;
        background-repeat: no-repeat;
        background-position: center center;
      `;
    }
    return '';
  }}
  border-radius: 50%;
  -webkit-user-select: none;
  -moz-user-select: none;
  user-select: none;
  -webkit-user-drag: none;
`;

export const ItemShade = styled.div`
  background-color: rgba(0, 0, 0, 0.6);
  color: white;
  position: absolute;
  font-size: 0.6rem;
  width: calc(100% - 10px);
  height: calc(100% - 10px);
  padding: 5px;
  overflow: hidden;
  top: 0;
  left: 0;
  opacity: 0;
  transition: opacity 0.25s;
`;

export const ItemTitle = styled.div`
  color: white;
  position: absolute;
  font-size: 0.6rem;
  width: calc(100% - 1rem);
  height: 3rem;
  padding: 0.5rem 0.5rem 0 0.5rem;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box !important;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  top: 0;
  left: 0;
`;
export const Group = styled.div`
  border-radius: 10px;
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
  #InboxX {
    opacity: 0;
  }
  :hover {
    #InboxX {
      opacity: 100;
    }
  }
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
  font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen,
    Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif;
`;
