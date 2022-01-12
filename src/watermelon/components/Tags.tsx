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
import { baseUrl } from '../../utils/utils';

const Tags: React.FC<{
  tags: TagModel[];
  onClick?: (tag: TagModel) => void;
  onDelete?: (tag: TagModel) => void;
}> = observer(({ tags, onClick, onDelete }) => {
  return (
    <>
      {tags.map((tag) => {
        return (
          <Tag
            key={tag.id}
            tag={tag}
            onClick={
              onClick
                ? () => {
                    onClick(tag);
                  }
                : undefined
            }
            onDelete={
              onDelete
                ? () => {
                    onDelete(tag);
                  }
                : undefined
            }
          />
        );
      })}
    </>
  );
});

export const enhanceWithAllTags = withObservables(
  [],
  ({ database }: { database: Database }) => ({
    tags: database.get<TagModel>(TableName.TAGS).query(),
  })
);

export const enhanceWithAllTagsAndPages = withObservables(
  [],
  ({ database }: { database: Database }) => ({
    tags: database.get<TagModel>(TableName.TAGS).query(),
    pages: database.get<PageModel>(TableName.PAGES).query(),
  })
);

// finds all pages with a url and gets all of their tags
// there should not be multiple pages with the same url, so this should just get one pages tags
export const enhancePageFromUrlWithTags = withObservables(
  ['pageUrl'],
  ({ database, pageUrl }: { database: Database; pageUrl: string }) => ({
    tags: database
      .get<TagModel>(TableName.TAGS)
      .query(
        Q.experimentalNestedJoin(TableName.PAGETAGS, TableName.PAGES),
        Q.on(TableName.PAGETAGS, Q.on(TableName.PAGES, 'url', baseUrl(pageUrl)))
      ),
  })
);

const enhancePageWithTags = withObservables(
  ['page'],
  ({ page }: { page: PageModel }) => ({
    tags: page.tags,
  })
);

const TagsFiltered: React.FC<{
  filterText: string;
  tags: TagModel[];
  onClick?: (tag: TagModel) => void;
  onDelete?: (tag: TagModel) => void;
}> = observer(({ filterText, tags, onClick, onDelete }) => {
  return (
    <Tags
      tags={tags.filter((tag) =>
        tag.title.toLocaleLowerCase().includes(filterText.toLocaleLowerCase())
      )}
      onClick={onClick}
      onDelete={onDelete}
    />
  );
});

export const AllTagsFiltered = withDatabase(enhanceWithAllTags(TagsFiltered));

export const PageFromUrlTags = withDatabase(enhancePageFromUrlWithTags(Tags));

export const PageTags = enhancePageWithTags(Tags);

export const RelatedTags = withDatabase(
  enhanceWithTagPages(enhanceWithPageTags(Tags))
);
