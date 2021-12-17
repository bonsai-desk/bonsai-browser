import React from 'react';
import { withDatabase } from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import { observer } from 'mobx-react-lite';
import TagModel from '../TagModel';
import PageModel from '../PageModel';
import Page from './Page';

const Pages: React.FC<{
  pages: PageModel[];
  onClick?: (page: PageModel) => void;
}> = observer(({ pages, onClick }) => {
  return (
    <>
      {pages.map((page) => {
        const onClickHandler = onClick
          ? () => {
              onClick(page);
            }
          : undefined;
        return <Page key={page.id} page={page} onClick={onClickHandler} />;
      })}
    </>
  );
});

const enhance = withObservables(['tag'], ({ tag }: { tag: TagModel }) => ({
  pages: tag.pages,
}));

// eslint-disable-next-line import/prefer-default-export
export const TagPages = withDatabase(enhance(Pages));
