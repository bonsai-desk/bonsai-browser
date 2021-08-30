import styled from 'styled-components';

export const ColumnParent = styled.div`
  display: flex;
  justify-content: center;
  flex-direction: column;
  user-select: none;
  margin-right: 1rem;
  color: white;
  //width: 12.5rem;
  width: 10rem;
`;
export const HeaderOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 10px;
  transition-duration: 0.25s;

  :hover {
    background-color: rgba(0, 0, 0, 0.6);
  }
`;
export const ColumnHeaderParent = styled.div`
  display: flex;
  align-items: center;
  width: 100%;
  border-radius: 10px;
  height: 40px;
  margin-bottom: 5px;
  transition-duration: 0.25s;
  position: relative;
  overflow: hidden;

  :hover #RedX {
    opacity: 100;
  }

  #RedX {
    opacity: 0;
  }
`;
export const HeaderSpacer = styled.div`
  width: 10px;
  height: 10px;
`;
export const HeaderTitle = styled.div`
  text-shadow: 0 0 5px #9c9c9c;
  font-weight: bold;
  font-size: 1.35rem;
  margin-bottom: 10px;
  width: 174px;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
  margin-left: 5px;
`;
