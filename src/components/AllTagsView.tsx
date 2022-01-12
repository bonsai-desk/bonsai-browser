import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import {
  Alert,
  Button,
  CardActions,
  CardContent,
  Typography,
} from '@material-ui/core';
import { Box, Card, Modal, Stack } from '@mui/material';
import { useStore } from '../store/tab-page-store';
import { CenterModalBox } from './SettingsModal';
import TagModel from '../watermelon/TagModel';
import { deleteTag } from '../watermelon/databaseUtils';
import { ColumnContainer } from './Column';
import AllTags from '../watermelon/components/AllTagsList';
import BackColumn from './BackColumn';

const ConfirmModal = observer(
  ({
    title,
    warningMessage,
    actionText,
    actionColor,
    handleClose,
    handleConfirm,
    severity = 'warning',
  }: {
    title: string;
    warningMessage: string;
    actionText: string;
    actionColor?:
      | 'error'
      | 'inherit'
      | 'primary'
      | 'secondary'
      | 'success'
      | 'info'
      | 'warning'
      | undefined;
    handleClose: () => void;
    handleConfirm: () => void;
    severity?: 'success' | 'info' | 'warning' | 'error';
  }) => {
    return (
      <Card>
        <CardContent>
          <Typography gutterBottom variant="h5" component="div">
            {title}
          </Typography>

          <Stack spacing={1}>
            <Alert severity={severity}>{warningMessage}</Alert>
          </Stack>
        </CardContent>
        <CardActions>
          <Button
            size="small"
            onClick={() => {
              handleClose();
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              handleConfirm();
            }}
            color={actionColor}
            size="small"
          >
            {actionText}
          </Button>
        </CardActions>
      </Card>
    );
  }
);

const AllTagsView = observer(() => {
  const { tabPageStore, database } = useStore();

  const [deletingTag, setDeletingTag] = useState<TagModel | null>(null);
  const [deletingTagNumUses, setDeletingTagNumUses] = useState(0);

  let modalMessage = '';
  if (deletingTagNumUses === 0) {
    modalMessage = 'This tag is unused';
  } else if (deletingTagNumUses === 1) {
    modalMessage = `${deletingTagNumUses} page is using this tag. Are you sure you want to delete it?`;
  } else {
    modalMessage = `${deletingTagNumUses} pages are using this tag. Are you sure you want to delete it?`;
  }

  return (
    <>
      <ColumnContainer
        MiniColumn={<BackColumn />}
        Header={
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
        }
        Left={
          <AllTags
            onClick={(tag) => {
              tabPageStore.setViewingTag(tag);
            }}
            deleteTag={(tag) => {
              (async () => {
                const numUses = await tag.pages.fetchCount();
                setDeletingTagNumUses(numUses);
                setDeletingTag(tag);
              })();
            }}
          />
        }
      />

      <Modal
        open={deletingTag !== null}
        onClose={() => {
          setDeletingTag(null);
        }}
        sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}
      >
        <Box>
          <CenterModalBox>
            <ConfirmModal
              title={`Delete tag "${deletingTag?.title}"`}
              warningMessage={modalMessage}
              actionText="Delete"
              actionColor="error"
              handleClose={() => {
                setDeletingTag(null);
              }}
              handleConfirm={() => {
                if (deletingTag) {
                  deleteTag(database, deletingTag);
                }
                setDeletingTag(null);
              }}
              severity={deletingTagNumUses === 0 ? 'info' : 'warning'}
            />
          </CenterModalBox>
        </Box>
      </Modal>
    </>
  );
});

export default AllTagsView;
