import styled from 'styled-components';
import React, { useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';
import { Container, Paper, Stack } from '@material-ui/core';
import { ipcRenderer } from 'electron';
import { tagSideBarWidth } from '../constants';
import { useStore, View } from '../store/tab-page-store';
import { baseUrl } from '../utils/utils';
import { addTagStrings, removeTagStrings } from '../watermelon/databaseUtils';
import { PageFromUrlTags } from '../watermelon/components/Tags';

const Bounds = styled.div`
  position: absolute;
  //background-color: white;
  z-index: 1;
  //border-radius: 10px 0 0 0;
  //color: black;
`;

const Border = styled.div`
  width: calc(100% - 1px);
  height: 100%;
  //border-right: 1px solid gray;
`;

const PageTitle = styled.div`
  font-size: 1rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 5px;
`;

const Divider = styled.div`
  width: calc(100% - 10px);
  margin-left: 5px;
  height: 2px;
  background-color: gray;
`;

const Title = styled.div`
  font-size: 1.5rem;
  padding: 5px 5px 5px 15px;
`;

const TagSearch = styled.input`
  margin: 0 15px 0 15px;
  width: calc(100% - 30px - 30px);
  padding: 3px 15px 3px 15px;
  font-size: 1.5rem;
  border-radius: 9999999px;
  border: 1px solid black;
  outline: none;
`;

const AddTagButton = styled.button`
  font-size: 1rem;
  border-radius: 9999999px;
  border: 2px solid black;
  margin: 10px 0 10px 15px;

  :hover {
    filter: brightness(0.8);
  }
`;

const TagContent = observer(() => {
  const { tabPageStore, historyStore, database } = useStore();

  const tab = tabPageStore.openTabs[historyStore.active];
  let title = 'New Tab';
  let tabBaseUrl = '';
  if (tab) {
    title = tab.title;
    tabBaseUrl = baseUrl(tab.url);
  }

  const tagBoxRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    tabPageStore.tagBoxRef = tagBoxRef;
  }, [tabPageStore]);

  return (
    <Paper
      sx={{
        height: '100%',
        marginRight: '10px',
      }}
    >
      <PageTitle>{title === '' ? 'New Tab' : title}</PageTitle>
      <Divider />
      <Title>Add Tag:</Title>
      <TagSearch
        ref={tagBoxRef}
        onFocus={() => {
          runInAction(() => {
            tabPageStore.tagBoxFocus = true;
          });
        }}
        onBlur={() => {
          runInAction(() => {
            tabPageStore.tagBoxFocus = false;
          });
        }}
      />
      <AddTagButton
        onClick={() => {
          if (tagBoxRef.current) {
            const tagString = tagBoxRef.current.value.trim();
            if (tagString !== '') {
              addTagStrings(database, tabBaseUrl, tagString);
            }
          }
        }}
      >
        Add Tag
      </AddTagButton>
      <Divider />
      <Title>Tags:</Title>
      <Container>
        <Stack spacing={1}>
          <PageFromUrlTags
            pageUrl={tabBaseUrl}
            onClick={(tag) => {
              ipcRenderer.send('click-main');
              tabPageStore.View = View.TagView;
              tabPageStore.setViewingTag(tag);
            }}
            onDelete={(tag) => {
              removeTagStrings(database, tabBaseUrl, tag.title);
            }}
          />
        </Stack>
      </Container>
    </Paper>
  );
});

const TagSidebar = observer(() => {
  const { tabPageStore } = useStore();

  return (
    <Bounds
      style={{
        left: tabPageStore.innerBounds.x,
        top: tabPageStore.innerBounds.y,
        width: tagSideBarWidth,
        height: tabPageStore.innerBounds.height,
        display: tabPageStore.windowFloating ? 'none' : 'block',
      }}
    >
      <Border>
        <TagContent />
      </Border>
    </Bounds>
  );
});

export default TagSidebar;
