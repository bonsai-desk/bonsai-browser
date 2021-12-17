import styled from 'styled-components';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { Container, Divider, Stack, Typography } from '@material-ui/core';
import { ipcRenderer } from 'electron';
import { useStore, View } from '../store/tab-page-store';
import { tagSideBarWidth } from '../constants';
import PaperView from './PaperView';
import TagModel from '../watermelon/TagModel';
import { TagPages } from '../watermelon/components/Pages';
import { RelatedTags } from '../watermelon/components/Tags';

const LeftColumn = styled.div``;

const TagTitle = styled.div`
  font-size: 2rem;
  text-align: center;
  width: 80%;
  margin-left: calc(10% - 10px);
  background-color: #2121e8;
  color: white;
  border-radius: 999999px;
  margin-top: 25px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-left: 10px;
  padding-right: 10px;
`;

const Content = observer(({ tag }: { tag: TagModel }) => {
  const { tabPageStore } = useStore();

  // const relatedTags: Record<string, Instance<typeof Tag>> = {};
  // pages.forEach((page) => {
  //   page.tags.forEach((pageTag) => {
  //     if (pageTag.id !== tag.id && !relatedTags[pageTag.id]) {
  //       relatedTags[pageTag.id] = pageTag;
  //     }
  //   });
  // });

  return (
    <>
      <LeftColumn style={{ width: tagSideBarWidth }}>
        <TagTitle>{tag.title}</TagTitle>
        <Typography
          variant="h6"
          sx={{
            paddingLeft: '15px',
            fontWeight: 'bold',
            marginTop: '20px',
            marginBottom: '15px',
          }}
        >
          Related Tags:
        </Typography>
        <Container>
          <Stack spacing={1}>
            <RelatedTags
              tag={tag}
              onClick={(clickedTag) => {
                ipcRenderer.send('click-main');
                tabPageStore.View = View.TagView;
                tabPageStore.setViewingTag(clickedTag);
              }}
            />
          </Stack>
        </Container>
      </LeftColumn>
      <Divider orientation="vertical" />
      <Container>
        <Stack spacing={1}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 'bold',
              marginTop: '20px',
              marginBottom: '15px',
            }}
          >
            Pages with this tag:
          </Typography>
          <TagPages
            tag={tag}
            onClick={(page) => {
              ipcRenderer.send('open-workspace-url', page.url);
            }}
          />
        </Stack>
      </Container>
    </>
  );
});

const TagView = observer(() => {
  const { tabPageStore } = useStore();

  const tag = tabPageStore.viewingTag;
  const content = tag ? <Content tag={tag} /> : null;

  return <PaperView>{content}</PaperView>;
});

export default TagView;
