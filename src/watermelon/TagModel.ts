import { Model, Q } from '@nozbe/watermelondb';
import { date, lazy, readonly, text } from '@nozbe/watermelondb/decorators';
import { Associations } from '@nozbe/watermelondb/Model';
import { TableName } from './schema';
// eslint-disable-next-line import/no-cycle
import PageModel from './PageModel';

export interface TagModelDataType {
  id: string;
  created_at: Date;
  updated_at: Date;
  title: string;
}

export default class TagModel extends Model {
  static table = TableName.TAGS;

  static associations: Associations = {
    [TableName.PAGETAGS]: { type: 'has_many', foreignKey: 'tag_id' },
  };

  @readonly @date('created_at') createdAt!: Date;

  @readonly @date('updated_at') updatedAt!: Date;

  @text('title') title!: string;

  @lazy pages = this.collections
    .get<PageModel>(TableName.PAGES)
    .query(Q.on(TableName.PAGETAGS, 'tag_id', this.id));
}
