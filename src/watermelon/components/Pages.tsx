import React, { useEffect } from 'react';
import { withDatabase } from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import { observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';
import TagModel from '../TagModel';
import PageModel from '../PageModel';
import ControlledList from '../../components/ControlledPageList';
import { useStore } from '../../store/tab-page-store';
import { pagesToItems } from '../../utils/xutils';

const Pages: React.FC<{
  tag: TagModel;
  pages: PageModel[];
}> = observer(({ tag, pages }) => {
  const { tabPageStore } = useStore();

  pages.sort((a, b) => {
    if (a.createdAt.getTime() > b.createdAt.getTime()) {
      return -1;
    }
    if (a.createdAt.getTime() < b.createdAt.getTime()) {
      return 1;
    }
    return 0;
  });

  const items = pagesToItems(tabPageStore, pages, 'tag page', tag);

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
