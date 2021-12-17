import React from 'react';
import { withDatabase } from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import { Database } from '@nozbe/watermelondb';
import { TableName } from '../schema';
import PageModel from '../PageModel';
import Page from './Page';

const Pages: React.FC<{ pages: PageModel[] }> = ({ pages }) => {
  return (
    <>
      {pages.map((page) => {
        return <Page key={page.id} page={page} />;
      })}
    </>
  );
};

const enhance = withObservables([], ({ database }: { database: Database }) => ({
  pages: database.get<PageModel>(TableName.PAGES).query(),
}));

const AllPages = withDatabase(enhance(Pages));

export default AllPages;
