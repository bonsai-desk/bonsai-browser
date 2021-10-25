import styled, { css } from 'styled-components';

export const TabParent = styled.div`
  overflow: hidden;
  background-color: white;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  word-wrap: break-word;
  text-overflow: ellipsis;
  margin-bottom: 0.5rem;
`;

export const FaviconParent = styled.div`
  width: 1em;
  height: 1em;
  background-color: black;
`;

export const TitleRow = styled.div`
  background-color: lightgray;
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  align-content: center;
  justify-content: flex-end;
`;

export const Description = styled.div`
  width: 100%;
  overflow: hidden;
  font-size: 0.6rem;
  font-weight: 600;
  background-color: blue;
`;

export const Title = styled.div`
  width: 50%;
  overflow: hidden;
  font-size: 0.6rem;
  font-weight: 600;
  background-color: blue;
`;

export const TabImageParent = styled.div`
  position: relative;
  width: 100%;
  padding-top: 56.25%;
  background-size: cover; /* <------ */
  background-repeat: no-repeat;
  //position: relative; /* If you want text inside of it */
  z-index: 0;
  display: flex;
  justify-content: center;
  overflow: hidden;

  //@media (prefers-color-scheme: dark) {
  //  box-shadow: rgba(255, 255, 255, 0.16) 0 10px 36px 0,
  //    rgba(0, 0, 0, 0.06) 0 0 0 1px;
  //}
  //@media (prefers-color-scheme: light) {
  //  box-shadow: rgba(0, 0, 0, 0.16) 0 10px 36px 0, rgba(0, 0, 0, 0.06) 0 0 0 1px;
  //}

  ${({ img }: { img: string }) => {
    let image = 'background-color: white;';
    if (img) {
      image = `background-image: ${img};`;
    }
    return css`
      ${image}
    `;
  }}
`;
export const TitleParent = styled.div`
  font-size: 0.6rem;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  transition-duration: 0.25s;
  opacity: ${({ hover }: { hover: boolean }) => (hover ? 100 : 0)};
  z-index: 10;
`;
export const RedXParent = styled.div`
  font-size: 0.6rem;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transition-duration: 0.25s;
  opacity: 0;
  ${({ disableHover = false }: { disableHover?: boolean }) => {
    if (!disableHover) {
      return css`
        :hover {
          opacity: 100;
        }
      `;
    }
    return '';
  }};
  z-index: 10;
`;
export const TabTitle = styled.div`
  width: calc(100% - 1rem);
  height: 1.75rem;
  margin: 0.5rem 0.5rem 0 0.5rem;
  font-weight: 600;
  text-overflow: ellipsis;
  overflow: hidden;
  // Addition lines for 2 line or multiline ellipsis
  display: -webkit-box !important;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  white-space: normal;
`;
