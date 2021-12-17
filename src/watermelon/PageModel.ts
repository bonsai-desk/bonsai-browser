import { Model, Q } from '@nozbe/watermelondb';
import { date, lazy, readonly, text } from '@nozbe/watermelondb/decorators';
import { Associations } from '@nozbe/watermelondb/Model';
import { TableName } from './schema';
// eslint-disable-next-line import/no-cycle
import TagModel from './TagModel';

export default class PageModel extends Model {
  static table = TableName.PAGES;

  static associations: Associations = {
    [TableName.PAGETAGS]: { type: 'has_many', foreignKey: 'page_id' },
  };

  @readonly @date('created_at') createdAt!: Date;

  @readonly @date('updated_at') updatedAt!: Date;

  @text('url') url!: string;

  @lazy
  tags = this.collections
    .get<TagModel>(TableName.TAGS)
    .query(Q.on(TableName.PAGETAGS, 'page_id', this.id));

  @lazy
  tagsWithId(tagId: string) {
    return this.tags.extend(Q.where('id', tagId));
  }
}
