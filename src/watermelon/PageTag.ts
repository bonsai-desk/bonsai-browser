import { Model, Relation } from '@nozbe/watermelondb';
import { immutableRelation } from '@nozbe/watermelondb/decorators';
import { Associations } from '@nozbe/watermelondb/Model';
import { TableName } from './schema';
import PageModel from './PageModel';
import TagModel from './TagModel';

export interface PageTagDataType {
  id: string;
  page_id: string;
  tag_id: string;
}

export default class PageTag extends Model {
  static table = TableName.PAGETAGS;

  static associations: Associations = {
    [TableName.PAGES]: { type: 'belongs_to', key: 'page_id' },
    [TableName.TAGS]: { type: 'belongs_to', key: 'tag_id' },
  };

  @immutableRelation(TableName.PAGES, 'page_id') page!: Relation<PageModel>;

  @immutableRelation(TableName.TAGS, 'tag_id') tag!: Relation<TagModel>;
}
