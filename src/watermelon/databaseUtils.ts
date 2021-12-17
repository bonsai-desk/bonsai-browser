import { Database, Q } from '@nozbe/watermelondb';
import { TableName } from './schema';
import TagModel from './TagModel';
import PageModel from './PageModel';
import PageTag from './PageTag';

export async function getTagOrCreate(
  database: Database,
  tagTitle: string
): Promise<TagModel> {
  const tagsTable = database.get<TagModel>(TableName.TAGS);

  const tags = await tagsTable.query(Q.where('title', tagTitle)).fetch();

  if (tags.length > 0) {
    return tags[0];
  }

  let newTag: TagModel;
  await database.write(async () => {
    newTag = await tagsTable.create((tag) => {
      tag.title = tagTitle;
    });
  });
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  if (!newTag) {
    throw new Error('could not create tag');
  }
  return newTag;
}
export async function getPage(
  database: Database,
  baseUrl: string
): Promise<PageModel | null> {
  const pages = await database
    .get<PageModel>(TableName.PAGES)
    .query(Q.where('url', baseUrl))
    .fetch();

  if (pages.length > 0) {
    return pages[0];
  }

  return null;
}
export async function getPageOrCreate(
  database: Database,
  baseUrl: string
): Promise<PageModel> {
  const page = await getPage(database, baseUrl);
  if (page) {
    return page;
  }

  let newPage: PageModel;
  await database.write(async () => {
    newPage = await database
      .get<PageModel>(TableName.PAGES)
      .create((createPage) => {
        createPage.url = baseUrl;
      });
  });
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  if (!newPage) {
    throw new Error('could not create page');
  }
  return newPage;
}

export async function addTag(
  database: Database,
  page: PageModel,
  tag: TagModel
) {
  const hasTag = (await page.tagsWithId(tag.id).fetchCount()) > 0;
  if (hasTag) {
    return;
  }

  await database.write(async () => {
    await database.get<PageTag>(TableName.PAGETAGS).create((pageTag) => {
      pageTag.page.set(page);
      pageTag.tag.set(tag);
    });
  });
}
export async function removeTag(
  database: Database,
  page: PageModel,
  tag: TagModel
) {
  const hasTag = (await page.tagsWithId(tag.id).fetchCount()) > 0;
  if (!hasTag) {
    return;
  }

  const pageTags = await database
    .get<PageTag>(TableName.PAGETAGS)
    .query(Q.where('page_id', page.id), Q.where('tag_id', tag.id))
    .fetch();

  await database.write(async () => {
    for (let i = pageTags.length - 1; i >= 0; i -= 1) {
      pageTags[i].markAsDeleted();
    }

    const numTags = await page.tags.fetchCount();
    if (numTags === 0) {
      await page.markAsDeleted();
    }
  });
}
export async function addTagStrings(
  database: Database,
  pageBaseUrl: string,
  tagTitle: string
) {
  const page = await getPageOrCreate(database, pageBaseUrl);
  const tag = await getTagOrCreate(database, tagTitle);
  await addTag(database, page, tag);
}
export async function removeTagStrings(
  database: Database,
  pageBaseUrl: string,
  tagTitle: string
) {
  const page = await getPageOrCreate(database, pageBaseUrl);
  const tag = await getTagOrCreate(database, tagTitle);
  await removeTag(database, page, tag);
}
