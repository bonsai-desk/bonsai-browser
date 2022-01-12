import { withDatabase } from '@nozbe/watermelondb/DatabaseProvider';
import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
// import { ipcRenderer } from 'electron';
import TagModel from '../TagModel';
import { useStore } from '../../store/tab-page-store';
import { tagsToItems } from '../../utils/xutils';
import ControlledList from '../../components/ControlledPageList';
import { enhanceWithAllTags } from './Tags';

const AllTagsList: React.FC<{
  tags: TagModel[];
  onClick?: (tag: TagModel) => void;
  onDelete?: (tag: TagModel) => void;
  deleteTag?: (tag: TagModel) => void;
}> = observer(({ tags, deleteTag }) => {
  const [counts, setCounts] = useState<number[]>([]);
  const { tabPageStore } = useStore();

  useEffect(() => {
    async function fetchCounts() {
      const countsPromises: Promise<number>[] = [];
      tags.forEach((tag) => {
        countsPromises.push(tag.pages.fetchCount());
      });
      setCounts(await Promise.all(countsPromises));
    }

    fetchCounts();
  }, [tags]);

  if (counts.length !== tags.length) {
    return null;
  }

  const sortable = counts.map((count, idx) => ({
    count,
    tag: tags[idx],
  }));
  sortable.sort((a, b) => {
    if (a.count > b.count) {
      return -1;
    }
    if (a.count < b.count) {
      return 1;
    }
    return 0;
  });

  const items = tagsToItems(
    tabPageStore,
    sortable.map((item) => item.tag),
    'all tags page',
    deleteTag,
    sortable.map((item) => item.count)
  );

  return <ControlledList items={items} initialHighlightedItemId="-1" />;
});
const AllTags = withDatabase(enhanceWithAllTags(AllTagsList));

export default AllTags;
