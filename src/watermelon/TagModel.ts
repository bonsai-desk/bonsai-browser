import { Model, Q } from '@nozbe/watermelondb';
import { date, lazy, readonly, text } from '@nozbe/watermelondb/decorators';
import { Associations } from '@nozbe/watermelondb/Model';
import { TableName } from './schema';
// eslint-disable-next-line import/no-cycle
import PageModel from './PageModel';

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

  // @lazy relatedTags: Query<TagModel> = this.collections
  //   .get<TagModel>(TableName.TAGS)
  //   .query(Q.where('id', this.id))
  //   .extend(Q.on(TableName.PAGETAGS, 'tag_id', this.id))
  //   .collection.database.get<PageTag>(TableName.PAGETAGS)
  //   .query();

  @lazy relatedTags = this.collections.get<TagModel>(TableName.TAGS).query();
}
