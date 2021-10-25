import styled from 'styled-components';

const HomeParent = styled.div`
  display: flex;
  align-items: flex-start;
  flex-grow: 1;
  margin: 0 10px 0 -10px;
  padding: 0 0 0 20px; // this is to stop shadow clipping
  overflow: scroll;
  ::-webkit-scrollbar {
    display: none;
  }
`;

export default HomeParent;
