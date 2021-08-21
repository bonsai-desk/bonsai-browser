import styled, { css } from 'styled-components';

export const TabParent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  word-wrap: break-word;
  text-overflow: ellipsis;
  margin-bottom: 1rem;
`;

export const TabImageParent = styled.div`
  width: 100%;
  padding-top: 56.25%;
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
  ${({ selected }: { selected: boolean }) => {
    if (selected) {
      return css`
        border-color: white;
        border-style: solid;
        border-width: 4px;
      `;
    }
    return css`
      margin: 4px;
    `;
  }}
`;
export const RedXParent = styled.div`
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
export const TabTitle = styled.div`
  width: calc(100% - 40px - 10px);
  height: 100%;
  padding: 5px;
  font-size: 15px;
  overflow: hidden;
`;
export const TabImg = styled.img`
  position: absolute;
  top: 0;
  height: 100%;
  object-fit: cover;
  z-index: -10;
`;
export const TabImageDummy = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  background-color: black;
  height: 100%;
  width: 100%;
`;
