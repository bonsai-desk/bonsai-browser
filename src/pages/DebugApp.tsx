import React from 'react';
import { observer } from 'mobx-react-lite';
import styled from 'styled-components';
import MetaStore from '../store/meta';

const metaStore = new MetaStore();

const Container = styled.div`
  margin-top: 3rem;
`;

const DebugApp = observer(() => {
  const authors = metaStore.authors.map((author) => (
    <li key={author.name}>{author.name}</li>
  ));
  const { abstract, title } = metaStore;
  return (
    <Container>
      <div>Title</div>
      <ul>
        <li>{title || 'No title found'}</li>
      </ul>
      <div>Authors</div>
      <ul>{authors.length > 0 ? authors : <li>No authors found</li>}</ul>
      <div>Abstract</div>
      <ul>
        <li>{abstract || 'No abstract found'}</li>
      </ul>
    </Container>
  );
});

export default DebugApp;
