import styled from 'styled-components';

export const Column = styled.div`
  display: flex;
  justify-content: center;
  flex-direction: column;
  align-items: center;
  user-select: none;
  padding: 5px 10px 5px 10px;
  margin-right: 25px;
  border-radius: 25px;
  color: white;
`;
export const ColumnHeader = styled.div`
  font-weight: bold;
  font-size: 1.5rem;
  margin-bottom: 10px;
`;
export const TabParent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  width: 175px;
  word-wrap: break-word;
  text-overflow: ellipsis;
  margin-bottom: 20px;
`;
export const TabImageParent = styled.div`
  height: 98px;
  width: 175px;
  position: relative;
  border-radius: 10px;
  display: flex;
  justify-content: center;
  overflow: hidden;
  object-fit: cover;
  :hover {
    .title {
      opacity: 100;
      background: red;
    }
  }
`;
export const RedX = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-content: center;
  justify-content: center;
`;
export const RedXParent = styled.div`
  font-size: 0.6rem;
  position: absolute;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  transition-duration: 0.25s;
  opacity: 0;
  :hover {
    opacity: 100;
  }
  :hover #RedX {
    transition-duration: 0s;
  }
  #RedX {
    transition-duration: 0.25s;
    border-radius: 999px;
    position: absolute;
    top: 10px;
    right: 10px;
    width: 30px;
    height: 30px;
    background: rgba(200, 200, 200, 0.7);
    :hover {
      background: rgba(255, 0, 0, 1);
    }
  }
`;
export const TabTitle = styled.div`
  width: calc(100% - 40px - 10px);
  height: 100%;
  padding: 5px;
  font-size: 15px;
  overflow: hidden;
`;
export const TabImage = styled.img`
  height: 100%;
  background: white;
`;
export const Favicon = styled.img`
  width: 16px;
  height: 16px;
`;
export const TabColumnsParent = styled.div`
  display: flex;
  align-items: flex-start;
  flex-grow: 1;
  overflow: auto;
`;
export const Background = styled.div`
  width: 100vw;
  height: 100vh;
  border-radius: 25px;
  display: flex;
  flex-direction: column;
`;
export const Footer = styled.div`
  width: 100%;
  height: 85px;
  display: flex;
  justify-content: center;
  align-items: center;
`;
export const WorkspaceButton = styled.button`
  border: none;
  outline: none;
  width: 75px;
  height: 75px;
  border-radius: 50%;

  :hover {
    background-color: lightgray;
  }
`;
