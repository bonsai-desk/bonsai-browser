import React from 'react';
import { observer } from 'mobx-react-lite';
import PageModel from '../PageModel';
import TagModel from '../TagModel';
import { useStore } from '../../store/tab-page-store';
import { IListItem } from '../../interface/ListItem';
import ControlledList from '../../components/ControlledPageList';
import { pagesToItems, tabsToGoogItems, tagsToItems } from '../../utils/xutils';
import { GoogListItem } from '../../components/ListItem';
import { baseUrl } from '../../utils/utils';

function aGoogleSearch(url: string) {
  return url.includes('google.com/search');
}

const TagItemsFiltered: React.FC<{
  filterText: string;
  pages: PageModel[];
  tags: TagModel[];
}> = observer(({ filterText, tags, pages }) => {
  const { tabPageStore } = useStore();

  const lowerFilterText = filterText.toLocaleLowerCase();

  const filteredOpenTabs = tabPageStore.filteredOpenTabs
    .map((value) => value.item)
    .filter((tab) => !aGoogleSearch(tab.url));

  const openUrls = filteredOpenTabs.map((tab) => baseUrl(tab.url));

  const openPageItems = tabsToGoogItems(
    tabPageStore,
    filteredOpenTabs,
    true,
    'search page'
  );

  const taggedPagesFiltered = pages.filter(
    (page) =>
      page.title.toLocaleLowerCase().includes(lowerFilterText) &&
      !openUrls.includes(page.url) &&
      !aGoogleSearch(page.url)
  );

  const taggedPageItems = pagesToItems(
    tabPageStore,
    taggedPagesFiltered,
    'search page',
    GoogListItem
  );

  const tagsFiltered = tagsToItems(
    tabPageStore,
    tags
      .filter((tag) => tag.title.toLocaleLowerCase().includes(lowerFilterText))
      .slice(0, 3),
    'search page'
  );

  const items: IListItem[] = tagsFiltered
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
