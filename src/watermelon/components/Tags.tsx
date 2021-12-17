import React from 'react';
import { withDatabase } from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import { Database, Q } from '@nozbe/watermelondb';
import { observer } from 'mobx-react-lite';
import { TableName } from '../schema';
import TagModel from '../TagModel';
import Tag from './Tag';
import PageModel from '../PageModel';
import {
  enhanceWithPageTags,
  enhanceWithTagPages,
} from '../enhanceWithRelatedTags';

const Tags: React.FC<{
  tags: TagModel[];
  onClick?: (tag: TagModel) => void;
  onDelete?: (tag: TagModel) => void;
}> = observer(({ tags, onClick, onDelete }) => {
  return (
    <>
      {tags.map((tag) => {
        const onDeleteHandler = onDelete
          ? () => {
              onDelete(tag);
            }
          : undefined;
        const onClickHandler = onClick
          ? () => {
              onClick(tag);
            }
          : undefined;
        return (
          <Tag
            key={tag.id}
            tag={tag}
            onClick={onClickHandler}
            onDelete={onDeleteHandler}
          />
        );
      })}
    </>
  );
});

const enhanceAllTags = withObservables(
  [],
  ({ database }: { database: Database }) => ({
    tags: database.get<TagModel>(TableName.TAGS).query(),
  })
);

// finds all pages with a url and gets all of their tags
// there should not be multiple pages with the same url, so this should just get one pages tags
const enhancePageFromUrlWithTags = withObservables(
  ['pageUrl'],
  ({ database, pageUrl }: { database: Database; pageUrl: string }) => ({
    tags: database
      .get<TagModel>(TableName.TAGS)
      .query(
        Q.experimentalNestedJoin(TableName.PAGETAGS, TableName.PAGES),
        Q.on(TableName.PAGETAGS, Q.on(TableName.PAGES, 'url', pageUrl))
      ),
  })
);

const enhancePageWithTags = withObservables(
  ['page'],
  ({ page }: { page: PageModel }) => ({
    tags: page.tags,
  })
);

export const AllTags = withDatabase(enhanceAllTags(Tags));

export const PageFromUrlTags = withDatabase(enhancePageFromUrlWithTags(Tags));

export const PageTags = enhancePageWithTags(Tags);

export const RelatedTags = withDatabase(
  enhanceWithTagPages(enhanceWithPageTags(Tags))
);
