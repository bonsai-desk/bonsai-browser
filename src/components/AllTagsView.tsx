import { observer } from 'mobx-react-lite';
import React from 'react';
import { Container, Stack, Typography } from '@material-ui/core';
import { ipcRenderer } from 'electron';
import PaperView from './PaperView';
import { AllTags } from '../watermelon/components/Tags';
import { useStore, View } from '../store/tab-page-store';

const AllTagsView = observer(() => {
  const { tabPageStore } = useStore();

  return (
    <PaperView>
      <Container>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 'bold',
            marginTop: '20px',
            marginBottom: '15px',
          }}
        >
          All Tags:
        </Typography>
        <Stack spacing={1}>
          <AllTags
            onClick={(tag) => {
              ipcRenderer.send('click-main');
              tabPageStore.View = View.TagView;
              tabPageStore.setViewingTag(tag);
            }}
          />
        </Stack>
      </Container>
    </PaperView>
  );
});

export default AllTagsView;
