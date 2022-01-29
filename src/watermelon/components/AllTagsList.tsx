import { withDatabase } from '@nozbe/watermelondb/DatabaseProvider';
import React, { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
// import { ipcRenderer } from 'electron';
import { makeAutoObservable } from 'mobx';
import TagModel from '../TagModel';
import { useStore } from '../../store/tab-page-store';
import { tagsToItems } from '../../utils/xutils';
import ControlledList from '../../components/ControlledPageList';
import { enhanceWithAllTags } from './Tags';
import { IListItem } from '../../interface/ListItem';

class AllTagStore {
  url = '';

  counts: number[] = [];

  cache: IListItem[] = [];

  async fetchCounts(tags: TagModel[]) {
    const countsPromises: Promise<number>[] = [];
    tags.forEach((tag) => {
      countsPromises.push(tag.pages.fetchCount());
    });
    this.counts = await Promise.all(countsPromises);
  }

  setCache(cache: IListItem[]) {
    this.cache = cache;
  }

  constructor() {
    makeAutoObservable(this);
  }
}

const allTagStore = new AllTagStore();

const AllTagsList: React.FC<{
  tags: TagModel[];
  onClick?: (tag: TagModel) => void;
  onDelete?: (tag: TagModel) => void;
  deleteTag?: (tag: TagModel) => void;
}> = observer(({ tags, deleteTag }) => {
  const { tabPageStore } = useStore();

  useEffect(() => {
    allTagStore.fetchCounts(tags);
  }, [tags]);

  const countAndTag = allTagStore.counts.map((count, idx) => ({
    count,
    tag: tags[idx],
  }));

  countAndTag.sort((a, b) => {
    if (a.count > b.count) {
      return -1;
    }
    if (a.count < b.count) {
      return 1;
    }
    return 0;
  });

  let items: IListItem[] = [];
  const gooodMatch = allTagStore.counts.length === tags.length;
  if (gooodMatch) {
    items = tagsToItems(
      tabPageStore,
      countAndTag.map((item) => item.tag),
      'all tags page',
      deleteTag,
      countAndTag.map((item) => item.count)
    );
    allTagStore.setCache(items);
  }

  return (
    <ControlledList
      items={gooodMatch ? items : allTagStore.cache}
      initialHighlightedItemId="-1"
    />
  );
});
const AllTags = withDatabase(enhanceWithAllTags(AllTagsList));

export default AllTags;
