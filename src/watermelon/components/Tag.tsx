import React from 'react';
import withObservables from '@nozbe/with-observables';
import { Box, Button, Card, CardContent, Chip, Grid } from '@mui/material';
import { LocalOffer } from '@mui/icons-material';
import { observer } from 'mobx-react-lite';
import TagModel from '../TagModel';
import PageModel from '../PageModel';

export const TagWithTitle: React.FC<{
  tagTitle: string;
  onClick?: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
  onDelete?: () => void;
  size?: 'small' | 'medium';
}> = observer(({ tagTitle, onClick, onDelete, size }) => {
  return (
    <div>
      <Chip
        label={tagTitle}
        icon={size !== 'small' ? <LocalOffer /> : undefined}
        sx={{ maxWidth: '100%' }}
        onClick={onClick}
        onDelete={onDelete}
        size={size}
      />
    </div>
  );
});

const TagWithTagModel: React.FC<{
  tag: TagModel;
  onClick?: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
  onDelete?: () => void;
  size?: 'small' | 'medium';
}> = observer(({ tag, onClick, onDelete, size }) => {
  return (
    <TagWithTitle
      size={size}
      tagTitle={tag.title}
      onClick={onClick}
      onDelete={onDelete}
    />
  );
});

const AllTagsCardItem: React.FC<{
  tag: TagModel;
  pages: PageModel[];
  onClick?: () => void;
  onDelete?: () => void;
  deleteTag?: () => void;
}> = observer(({ tag, pages, onClick, onDelete, deleteTag }) => {
  return (
    <Card
      sx={{
        order: -pages.length,
        marginBottom: '10px',
      }}
    >
      <CardContent>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={4} textAlign="center">
            <TagWithTagModel tag={tag} onClick={onClick} onDelete={onDelete} />
          </Grid>
          <Grid item xs={4} textAlign="center">
            <div>{`${pages.length} pages with tag`}</div>
          </Grid>
          <Grid item xs={4}>
            <Box textAlign="center">
              <Button variant="contained" color="error" onClick={deleteTag}>
                Delete Tag
              </Button>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
});

const enhance = withObservables(['tag'], ({ tag }: { tag: TagModel }) => ({
  tag,
}));

const enhanceWithPages = withObservables(
  ['tag'],
  ({ tag }: { tag: TagModel }) => ({
    tag,
    pages: tag.pages,
  })
);

export default enhance(TagWithTagModel);

export const AllTagsCard = enhanceWithPages(AllTagsCardItem);
