import React, { useEffect, useState } from 'react';
import { withDatabase } from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import { observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';
import TagModel from '../TagModel';
import PageModel from '../PageModel';
import ControlledList from '../../components/ControlledPageList';
import { useStore } from '../../store/tab-page-store';
import { pagesToItems, titleToItem } from '../../utils/xutils';
import { IListItem } from '../../interface/ListItem';
import { PageListItem } from '../../components/ListItem';

const Pages: React.FC<{
  tag: TagModel;
  pages: PageModel[];
}> = observer(({ tag, pages }) => {
  const { tabPageStore } = useStore();

  const [pageTags, setPageTags] = useState<
    { page: PageModel; tags: TagModel[] }[]
  >([]);

  useEffect(() => {
    const promises: Promise<TagModel[]>[] = [];
    const sortedPages = pages
      .map((page) => page)
      .sort((a, b) => {
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
    for (let i = 0; i < sortedPages.length; i += 1) {
      promises.push(sortedPages[i].tags.fetch());
    }
    Promise.all(promises)
      .then((values) => {
        const newPageTags: { page: PageModel; tags: TagModel[] }[] = [];
        for (let i = 0; i < sortedPages.length; i += 1) {
          newPageTags.push({ page: sortedPages[i], tags: values[i] });
        }
        setPageTags(newPageTags);
        return null;
      })
      .catch(() => {
        //
      });
  }, [pages]);

  pageTags.sort((a, b) => {
    return b.tags.length - a.tags.length;
  });

  const tagGroupsTitlesOrder: string[] = [];
  const tagGroups: Record<string, PageModel[]> = {};
  const singleTagGroup: PageModel[] = [];
  const threeOrMoreTagsGroup: PageModel[] = [];

  pageTags.forEach(({ page, tags }) => {
    let otherTagTitle = '';
    switch (tags.length) {
      case 1:
        singleTagGroup.push(page);
        break;
      case 2:
        for (let i = 0; i < tags.length; i += 1) {
          if (tags[i].title !== tag.title) {
            otherTagTitle = tags[i].title;
            break;
          }
        }
        if (!tagGroupsTitlesOrder.includes(otherTagTitle)) {
          tagGroupsTitlesOrder.push(otherTagTitle);
        }
        if (!tagGroups[otherTagTitle]) {
          tagGroups[otherTagTitle] = [];
        }
        tagGroups[otherTagTitle].push(page);
        break;
      default:
        threeOrMoreTagsGroup.push(page);
        break;
    }
  });

  const items: IListItem[] = [];

  tagGroupsTitlesOrder.forEach((title) => {
    items.push(
      titleToItem(title, tabPageStore, 'tag page', undefined, () => {
        tabPageStore.goToTag(title);
      })
    );
    const pageItems = pagesToItems(
      tabPageStore,
      tagGroups[title],
      'tag page',
      PageListItem,
      tag,
      [tag.title, title]
    );
    pageItems.forEach((pageItem) => {
      items.push(pageItem);
    });
  });

  if (singleTagGroup.length > 0) {
    items.push(
      titleToItem(`${tag.title} only`, tabPageStore, 'tag page', undefined)
    );
    const pageItems = pagesToItems(
      tabPageStore,
      singleTagGroup,
      'tag page',
      PageListItem,
      tag,
      [tag.title]
    );
    pageItems.forEach((pageItem) => {
      items.push(pageItem);
    });
  }

  if (threeOrMoreTagsGroup.length > 0) {
    items.push(titleToItem(`3+ tags`, tabPageStore, 'tag page', undefined));
    const pageItems = pagesToItems(
      tabPageStore,
      threeOrMoreTagsGroup,
      'tag page',
      PageListItem,
      tag,
      [tag.title]
    );
    pageItems.forEach((pageItem) => {
      items.push(pageItem);
    });
  }

  useEffect(() => {
    return () => {
      runInAction(() => {
        tabPageStore.lastSelectedListItemId = '';
      });
    };
  }, [tabPageStore]);

  const firstItemId = items.length > 0 ? items[0].id : '0';
  const initialItemId = tabPageStore.lastSelectedListItemId;

  return (
    <ControlledList
      items={items}
      initialHighlightedItemId={initialItemId || firstItemId}
    />
  );
});

const enhance = withObservables(['tag'], ({ tag }: { tag: TagModel }) => ({
  tag,
  pages: tag.pages,
}));

// eslint-disable-next-line import/prefer-default-export
export const TagPages = withDatabase(enhance(Pages));
