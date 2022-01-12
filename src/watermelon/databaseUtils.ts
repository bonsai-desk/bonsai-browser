import { Database, Q } from '@nozbe/watermelondb';
import { sanitizedRaw } from '@nozbe/watermelondb/RawRecord';
import { ipcRenderer } from 'electron';
import { TableName } from './schema';
import TagModel, { TagModelDataType } from './TagModel';
import PageModel, { PageModelDataType } from './PageModel';
import PageTag, { PageTagDataType } from './PageTag';

async function numTags(database: Database) {
  return database.get<TagModel>(TableName.TAGS).query().fetchCount();
}

async function numTagUsage(database: Database) {
  return database.get<PageTag>(TableName.PAGETAGS).query().fetchCount();
}

async function trackNumTagUsage(database: Database) {
  const num = await numTagUsage(database);
  ipcRenderer.send('mixpanel-set-user-prop', { total_tag_usage: num });
}

async function trackNumTags(database: Database) {
  const num = await numTags(database);
  ipcRenderer.send('mixpanel-set-user-prop', { total_tags: num });
}

export async function getTag(
  database: Database,
  tagTitle: string
): Promise<TagModel | null> {
  if (tagTitle === '') {
    return null;
  }

  const tags = await database
    .get<TagModel>(TableName.TAGS)
    .query(Q.where('title', Q.like(`%${Q.sanitizeLikeString(tagTitle)}%`)))
    .fetch();

  let tagMatch: TagModel | null = null;
  tags.forEach((tag) => {
    if (
      !tagMatch &&
      tag.title.toLocaleLowerCase() === tagTitle.toLocaleLowerCase()
    ) {
      tagMatch = tag;
    }
  });

  return tagMatch;
}

export async function getTagOrCreate(
  database: Database,
  tagTitle: string
): Promise<TagModel> {
  const tag = await getTag(database, tagTitle);
  if (tag) {
    return tag;
  }

  let newTag: TagModel;
  await database.write(async () => {
    newTag = await database
      .get<TagModel>(TableName.TAGS)
      .create((createTag) => {
        createTag.title = tagTitle;
      });
  });
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  if (!newTag) {
    throw new Error('could not create tag');
  }

  trackNumTags(database);

  const num = await numTags(database);
  ipcRenderer.send('mixpanel-track-with-props', [
    'create tag',
    { total_tags: num },
  ]);

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
  baseUrl: string,
  pageInfo: { title: string; favicon: string }
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
        createPage.title = pageInfo.title;
        createPage.favicon = pageInfo.favicon;
        createPage.image = ''; // todo: page image
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

  trackNumTagUsage(database);

  const num = await numTagUsage(database);
  ipcRenderer.send('mixpanel-track-with-props', [
    'apply tag',
    { total_tag_usage: num },
  ]);
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
      // eslint-disable-next-line no-await-in-loop
      await pageTags[i].destroyPermanently();
    }

    const num = await page.tags.fetchCount();
    if (num === 0) {
      await page.destroyPermanently();
    }
  });

  trackNumTagUsage(database);

  const num = await numTagUsage(database);
  ipcRenderer.send('mixpanel-track-with-props', [
    'remove tag',
    { total_tag_usage: num },
  ]);
}

export async function addTagStrings(
  database: Database,
  pageBaseUrl: string,
  tagTitle: string,
  pageInfo: { title: string; favicon: string }
) {
  const page = await getPageOrCreate(database, pageBaseUrl, pageInfo);
  const tag = await getTagOrCreate(database, tagTitle);
  await addTag(database, page, tag);
}

export async function removeTagStrings(
  database: Database,
  pageBaseUrl: string,
  tagTitle: string
) {
  const page = await getPage(database, pageBaseUrl);
  const tag = await getTag(database, tagTitle);
  if (!page || !tag) {
    return;
  }

  await removeTag(database, page, tag);
}

export async function deleteTag(database: Database, tag: TagModel) {
  const pageTags = await database
    .get<PageTag>(TableName.PAGETAGS)
    .query(Q.where('tag_id', tag.id))
    .fetch();

  await database.write(async () => {
    for (let i = pageTags.length - 1; i >= 0; i -= 1) {
      // eslint-disable-next-line no-await-in-loop
      await pageTags[i].destroyPermanently();
    }

    await tag.destroyPermanently();
  });

  trackNumTags(database);
  trackNumTagUsage(database);

  const num = await numTags(database);
  ipcRenderer.send('mixpanel-track-with-props', [
    'delete tag',
    { total_tags: num },
  ]);
}

export interface WatermelonDBData {
  pages: PageModelDataType[];
  tags: TagModelDataType[];
  page_tags: PageTagDataType[];
}

export async function exportWatermelon(
  database: Database
): Promise<WatermelonDBData> {
  const dbData: WatermelonDBData = { pages: [], tags: [], page_tags: [] };

  const pages = await database.get<PageModel>(TableName.PAGES).query().fetch();
  pages.forEach((page) => {
    dbData.pages.push({
      id: page.id,
      created_at: page.createdAt,
      updated_at: page.updatedAt,
      url: page.url,
      title: page.title,
      favicon: page.favicon,
      image: page.image,
    });
  });

  const tags = await database.get<TagModel>(TableName.TAGS).query().fetch();
  tags.forEach((tag) => {
    dbData.tags.push({
      id: tag.id,
      created_at: tag.createdAt,
      updated_at: tag.updatedAt,
      title: tag.title,
    });
  });

  const pageTags = await database
    .get<PageTag>(TableName.PAGETAGS)
    .query()
    .fetch();
  pageTags.forEach((pageTag) => {
    const pageId = pageTag.page.id;
    const tagId = pageTag.tag.id;
    if (pageId && tagId) {
      dbData.page_tags.push({
        id: pageTag.id,
        page_id: pageId,
        tag_id: tagId,
      });
    }
  });

  return dbData;
}

export async function importWatermelon(
  database: Database,
  dbData: WatermelonDBData
) {
  await database.write(async () => {
    await database
      .get<PageModel>(TableName.PAGES)
      .query()
      .destroyAllPermanently();

    await database
      .get<TagModel>(TableName.TAGS)
      .query()
      .destroyAllPermanently();

    await database
      .get<PageTag>(TableName.PAGETAGS)
      .query()
      .destroyAllPermanently();

    for (let i = 0; i < dbData.pages.length; i += 1) {
      const pageData = dbData.pages[i];
      // eslint-disable-next-line no-await-in-loop
      await database.get<PageModel>(TableName.PAGES).create((createPage) => {
        // eslint-disable-next-line no-underscore-dangle
        createPage._raw = sanitizedRaw(
          pageData,
          database.get<PageModel>(TableName.PAGES).schema
        );
      });
    }

    for (let i = 0; i < dbData.tags.length; i += 1) {
      const tagData = dbData.tags[i];
      // eslint-disable-next-line no-await-in-loop
      await database.get<TagModel>(TableName.TAGS).create((createTag) => {
        // eslint-disable-next-line no-underscore-dangle
        createTag._raw = sanitizedRaw(
          tagData,
          database.get<TagModel>(TableName.TAGS).schema
        );
      });
    }

    for (let i = 0; i < dbData.page_tags.length; i += 1) {
      const pageTagData = dbData.page_tags[i];
      // eslint-disable-next-line no-await-in-loop
      await database
        .get<PageTag>(TableName.PAGETAGS)
        .create((createPageTag) => {
          // eslint-disable-next-line no-underscore-dangle
          createPageTag._raw = sanitizedRaw(
            pageTagData,
            database.get<PageTag>(TableName.PAGETAGS).schema
          );
        });
    }
  });
}
