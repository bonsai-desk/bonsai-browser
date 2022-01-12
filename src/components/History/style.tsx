import styled, { css } from 'styled-components';

export const ModalParent = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  width: 100vw;
  height: 100vh;

  ${({ active }: { active: boolean }) =>
    css`
      display: ${active ? 'block' : 'none'};
    `}
`;
export const ModalBackground = styled.div`
  background-color: rgba(0.25, 0.25, 0.25, 0.35);
  //background-color: blue;
  position: absolute;
  left: 0;
  top: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-wrap: wrap;
  align-content: center;
  justify-content: center;
`;

export const ModalSheet = styled.div`
  box-shadow: rgba(0, 0, 0, 0.35) 0 5px 15px;
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  right: 0;
  margin: auto;
  width: 80vw;
  height: 80vh;
  background-color: white;
  border-radius: 10px;
  //border: 2px solid white;
  //box-shadow: 0 0 5px 0 rgba(0, 0, 0, 1);
  padding: 20px;
  overflow: scroll;
  ::-webkit-scrollbar {
    display: none;
  }
`;
export const HistoryResultsParent = styled.div`
  //background-color: blue;
  overflow-y: auto;
  height: calc(100% - 40px);
  ::-webkit-scrollbar {
    display: none;
  }
`;
export const HistoryHeader = styled.div`
  width: 100%;
  height: 40px;
  display: flex;
  align-items: center;
  margin-bottom: 5px;
`;
export const HistorySearch = styled.input`
  outline: none;
  padding: 5px 10px 5px 10px;
  border-radius: 10000px;
  border: 2px solid white;
  background-color: rgba(0, 0, 0, 0.1);
  //width: calc(100% - 20px - 4px);
  flex-grow: 1;
`;
export const ClearHistory = styled.button`
  width: 100px;
  height: 28px;
  border-radius: 1000000px;
  border: 2px solid white;
  outline: none;
  margin-left: 5px;
`;
export const HistoryResult = styled.div`
  background-color: gray;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 50px;
  text-align: center;
  border-radius: 25px;
  margin-bottom: 5px;
  padding-left: 20px;
  user-select: none;
  display: flex;
  align-items: center;

  :hover {
    cursor: pointer;
  }
`;
export const HistoryTitleDiv = styled.div`
  //background-color: red;
  line-height: 25px;
  margin: 10px;
  color: white;
`;
export const HistoryUrlDiv = styled.div`
  line-height: 25px;
  margin: 10px;
  color: lightgrey;
  font-size: 15px;
`;
