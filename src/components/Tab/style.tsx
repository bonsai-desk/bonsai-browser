import styled, { css } from 'styled-components';

export const TabParent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  word-wrap: break-word;
  text-overflow: ellipsis;
  margin-bottom: 0.5rem;
`;
export const TabImageParent = styled.div`
  width: 100%;
  padding-top: 56.25%;
  background-size: cover; /* <------ */
  background-repeat: no-repeat;
  position: relative; /* If you want text inside of it */
  z-index: 0;
  border-radius: 10px;
  border-width: 4px;
  display: flex;
  justify-content: center;
  overflow: hidden;
  @media (prefers-color-scheme: dark) {
    box-shadow: rgba(255, 255, 255, 0.16) 0 10px 36px 0,
      rgba(0, 0, 0, 0.06) 0 0 0 1px;
  }
  @media (prefers-color-scheme: light) {
    box-shadow: rgba(0, 0, 0, 0.16) 0 10px 36px 0, rgba(0, 0, 0, 0.06) 0 0 0 1px;
  }
  ${({ selected, img }: { selected: boolean; img: string }) => {
    let image = 'background-color: white;';
    if (img) {
      image = `background-image: ${img};`;
    }
    if (selected) {
      return css`
        border-color: white;
        border-style: solid;
        border-width: 4px;
        ${image}
      `;
    }
    return css`
      margin: 4px;
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
  // opacity: ${({ hover }: { hover: boolean }) => (hover ? 100 : 0)};
  opacity: 0;
  z-index: 10;
  :hover {
    opacity: 100
  }
`;
export const TabTitle = styled.div`
  width: calc(100% - 1rem);
  height: 2rem;
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
