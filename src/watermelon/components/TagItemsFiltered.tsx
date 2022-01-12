import React from 'react';
import { observer } from 'mobx-react-lite';
import PageModel from '../PageModel';
import TagModel from '../TagModel';
import { useStore } from '../../store/tab-page-store';
import { ListItem } from '../../interface/ListItem';
import ControlledList from '../../components/ControlledPageList';
import { pagesToItems, tabsToItems, tagsToItems } from '../../utils/xutils';

const TagItemsFiltered: React.FC<{
  filterText: string;
  pages: PageModel[];
  tags: TagModel[];
}> = observer(({ filterText, tags, pages }) => {
  const { tabPageStore } = useStore();

  const lowerFilterText = filterText.toLocaleLowerCase();

  const filteredOpenTabs = tabPageStore.filteredOpenTabs.map(
    (value) => value.item
  );

  const openUrls = filteredOpenTabs.map((tab) => tab.url);

  const openPageItems = tabsToItems(
    tabPageStore,
    filteredOpenTabs,
    true,
    'search page'
  );

  const taggedPagesFiltered = pages.filter(
    (page) =>
      page.title.toLocaleLowerCase().includes(lowerFilterText) &&
      !openUrls.includes(page.url)
  );

  const taggedPageItems = pagesToItems(
    tabPageStore,
    taggedPagesFiltered,
    'search page'
  );

  const tagsFiltered = tagsToItems(
    tabPageStore,
    tags.filter((tag) =>
      tag.title.toLocaleLowerCase().includes(lowerFilterText)
    ),
    'search page'
  );

  const items: ListItem[] = tagsFiltered
    .concat(openPageItems)
    .concat(taggedPageItems);

  return (
    <ControlledList
      items={items}
      initialHighlightedItemId="-1"
      snapToFirst={false}
      safeKeysOnly
      resetHighlightOnChange
      uncappedTop
    />
  );
});

export default TagItemsFiltered;
