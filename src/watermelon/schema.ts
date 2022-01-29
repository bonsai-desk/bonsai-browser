import { appSchema, tableSchema } from '@nozbe/watermelondb';

// to make code more readable and easier to refactor. The js variable name could be changed, but
// DO NOT CHANGE THE STRINGS. It will break backwards compatibility.
export enum TableName {
  PAGES = 'pages',
  TAGS = 'tags',
  PAGETAGS = 'page_tags',
}

const schema = appSchema({
  version: 2,
  tables: [
    tableSchema({
      name: TableName.PAGES,
      columns: [
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'url', type: 'string' },
        { name: 'title', type: 'string' },
        { name: 'favicon', type: 'string' },
        { name: 'image', type: 'string' },
        { name: 'description', type: 'string' },
      ],
    }),
    tableSchema({
      name: TableName.TAGS,
      columns: [
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'title', type: 'string' },
      ],
    }),
    tableSchema({
      name: TableName.PAGETAGS,
      columns: [
        { name: 'page_id', type: 'string', isIndexed: true },
        { name: 'tag_id', type: 'string', isIndexed: true },
      ],
    }),
  ],
});

export default schema;
