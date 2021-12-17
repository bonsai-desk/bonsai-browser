import React from 'react';
import withObservables from '@nozbe/with-observables';
import { Chip } from '@mui/material';
import { LocalOffer } from '@mui/icons-material';
import { observer } from 'mobx-react-lite';
import TagModel from '../TagModel';

const Tag: React.FC<{
  tag: TagModel;
  onClick?: () => void;
  onDelete?: () => void;
}> = observer(({ tag, onClick, onDelete }) => {
  return (
    <div>
      <Chip
        label={tag.title}
        icon={<LocalOffer />}
        sx={{ maxWidth: '100%' }}
        onClick={onClick}
        onDelete={onDelete}
      />
    </div>
  );
});

const enhance = withObservables(['tag'], ({ tag }: { tag: TagModel }) => ({
  tag,
}));

export default enhance(Tag);
