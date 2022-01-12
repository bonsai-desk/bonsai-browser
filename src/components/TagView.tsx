import { observer } from 'mobx-react-lite';
import React from 'react';
import { ipcRenderer } from 'electron';
import styled from 'styled-components';
import { Typography } from '@mui/material';
import { useStore } from '../store/tab-page-store';
import TagModel from '../watermelon/TagModel';
import { TagPages } from '../watermelon/components/Pages';
import { ColumnContainer } from './Column';
import { TagWithTitle } from '../watermelon/components/Tag';
import BackColumn from './BackColumn';

const TagViewHeaderParent = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-content: center;
  justify-content: center;
`;

const TagViewHeader = observer(({ tag }: { tag: TagModel }) => {
  return (
    <TagViewHeaderParent>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          margin: 'auto 0 auto 0',
        }}
      >
        <Typography variant="h6">Pages with&nbsp;</Typography>
      </div>
      <div style={{ margin: 'auto 0 auto 0' }}>
        <TagWithTitle
          tagTitle={tag.title}
          onClick={() => {
            // fake on click to change cursor to pointer
          }}
        />
      </div>
    </TagViewHeaderParent>
  );

  // return (
  //   <LeftColumn style={{ width: 200 }}>
  //     <TagTitle>{tag.title}</TagTitle>
  //     <Container>
  //       <Stack spacing={1}>
  //         <RelatedTags
  //           tag={tag}
  //           onClick={(clickedTag) => {
  //             tabPageStore.setViewingTag(clickedTag);
  //           }}
  //         />
  //       </Stack>
  //     </Container>
  //   </LeftColumn>
  // );
});

const Content = observer(({ tag }: { tag: TagModel }) => {
  // const { tabPageStore } = useStore();

  return (
    <ColumnContainer
      MiniColumn={<BackColumn />}
      Header={<TagViewHeader tag={tag} />}
      Left={
        <TagPages
          tag={tag}
          onClick={(page) => {
            ipcRenderer.send('open-workspace-url', page.url);
          }}
        />
      }
    />
  );
});

const TagView = observer(() => {
  const { tabPageStore } = useStore();

  const tag = tabPageStore.viewingTag;
  return tag ? <Content tag={tag} /> : null;
});

export default TagView;
