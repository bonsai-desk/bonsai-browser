import React from 'react';
import withObservables from '@nozbe/with-observables';
import { Chip } from '@mui/material';
import { Public } from '@mui/icons-material';
import { observer } from 'mobx-react-lite';
import PageModel from '../PageModel';

const Page: React.FC<{ page: PageModel; onClick?: () => void }> = observer(
  ({ page, onClick }) => {
    return (
      <div>
        <Chip label={page.title} icon={<Public />} onClick={onClick} />
      </div>
    );
  }
);

const enhance = withObservables(['page'], ({ page }: { page: PageModel }) => ({
  page,
}));

export default enhance(Page);
