import withObservables from '@nozbe/with-observables';
import { Database, Q } from '@nozbe/watermelondb';
import TagModel from './TagModel';
import PageModel from './PageModel';
import { TableName } from './schema';

export const enhanceWithTagPages = withObservables(
  ['tag'],
  ({ tag }: { tag: TagModel }) => ({
    pages: tag.pages,
    tag,
  })
);

export const enhanceWithPageTags = withObservables(
  ['pages'],
  ({
    database,
    pages,
    tag,
  }: {
    database: Database;
    pages: PageModel[];
    tag: TagModel;
  }) => ({
    tags: database
      .get<TagModel>(TableName.TAGS)
      .query(
        Q.on(
          TableName.PAGETAGS,
          Q.where('page_id', Q.oneOf(pages.map((page) => page.id)))
        ),
        Q.where('title', Q.notEq(tag.title))
      ),
  })
);
