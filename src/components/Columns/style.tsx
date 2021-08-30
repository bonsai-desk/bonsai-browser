import styled, { css } from 'styled-components';
import redX from '../../../assets/x-letter.svg';

export const ColumnParent = styled.div`
  display: flex;
  justify-content: center;
  flex-direction: column;
  user-select: none;
  margin-right: 1rem;
  color: white;
  width: 10rem;
`;
export const ColumnHeaderParent = styled.div`
  padding: 0.75rem 0 0.75rem 0;
  display: flex;
  align-items: center;
  width: 100%;
  height: 40px;
  transition-duration: 0.25s;
  position: relative;
  overflow: hidden;
  :hover {
    #FaviconX {
      opacity: 100;
    }
  }
`;
export const HeaderTitle = styled.div`
  text-shadow: 0 0 5px #9c9c9c;
  font-weight: bold;
  font-size: 1.35rem;
  width: 174px;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
  height: 100%;
  padding: 0 0 0 0.5rem;
`;

export const FaviconParent = styled.div`
  margin: 0 0 0 0.5rem;
  position: relative;
  height: 1.5rem;
  width: 1.5rem;
  border-radius: 50%;
  overflow: hidden;
`;

export const FaviconX = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  background-color: gray;
  width: 100%;
  height: 100%;
  background-image: url(${redX});
  background-size: cover;
  background-repeat: no-repeat;
  background-position: center center;
  opacity: 0;
  transition-duration: 0.25s;
  :hover {
    transition-duration: 0s;
    background-color: red;
  }
`;

export const HeaderFavicon = styled.div`
  width: 100%;
  height: 100%;
  background-color: white;
  ${({ img }: { img: string }) => {
    if (img) {
      return css`
        background-image: ${img};
      `;
    }
    return '';
  }}
  background-size: cover;
  background-repeat: no-repeat;
  background-position: center center;
`;
