import {
  addColumns,
  schemaMigrations,
} from '@nozbe/watermelondb/Schema/migrations';
import { TableName } from './schema';

export default schemaMigrations({
  migrations: [
    {
      toVersion: 2,
      steps: [
        addColumns({
          table: TableName.PAGES,
          columns: [
            { name: 'description', type: 'string' },
            { name: 'total_interaction_time', type: 'number' },
          ],
        }),
      ],
    },
  ],
});
