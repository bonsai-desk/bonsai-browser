import styled from 'styled-components';

export const TabParent = styled.div`
  overflow: hidden;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  word-wrap: break-word;
  text-overflow: ellipsis;
  margin-bottom: 0.5rem;
`;

export const TabImageParent = styled.div`
  position: relative;
  z-index: 0;
  overflow: hidden;
`;
export const TabImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
`;
