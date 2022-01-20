import React from 'react';
import { withDatabase } from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import { observer } from 'mobx-react-lite';
import { ipcRenderer } from 'electron';
import { runInAction } from 'mobx';
import TagModel from '../TagModel';
import PageModel from '../PageModel';
import ControlledList from '../../components/ControlledPageList';
import { useStore } from '../../store/tab-page-store';
import { tabTitle } from '../../interfaces/tab';
import { PageListItem } from '../../components/ListItem';
import { ListItem } from '../../interface/ListItem';
import { trackOpenItem } from '../../utils/tracking';
import { baseUrl } from '../../utils/utils';

const Pages: React.FC<{
  tag: TagModel;
  onClick?: (page: PageModel) => void;
  pages: PageModel[];
}> = observer(({ tag, onClick, pages }) => {
  const { tabPageStore } = useStore();

  const openUrls = Object.values(tabPageStore.openTabs).map((tab) =>
    baseUrl(tab.url)
  );

  pages.sort((a, b) => {
    if (a.createdAt.getTime() > b.createdAt.getTime()) {
      return -1;
    }
    if (a.createdAt.getTime() < b.createdAt.getTime()) {
      return 1;
    }
    return 0;
  });

  const items: ListItem[] = pages.map((page) => ({
    id: page.id,
    item: page,
    Node: ({ active }: { active: boolean }) => (
      <PageListItem
        active={active}
        key={page.id}
        url={page.url}
        title={tabTitle(page)}
        favicon={page.favicon}
        hideTags={[]}
        firstTag={tag.title}
        noClickTags={[tag.title]}
        LED={openUrls.includes(page.url)}
      />
    ),
    onClick: (trigger) => {
      if (onClick) {
        trackOpenItem(trigger, 'saved page', 'tag page');
        onClick(page);
      }
    },
    onTag: () => {
      runInAction(() => {
        tabPageStore.selectedForTagTab = page;
      });
      ipcRenderer.send('open-tag-modal');
    },
    onIdChange: () => {
      tabPageStore.setHighlightedTabId(page.id);
    },
    onLazyIdChange: () => {
      runInAction(() => {
        tabPageStore.activeHomeTabId = page.id;
      });
    },
  }));
  return (
    <ControlledList
      items={items}
      initialHighlightedItemId={items.length > 0 ? items[0].id : '0'}
    />
  );
});

const enhance = withObservables(['tag'], ({ tag }: { tag: TagModel }) => ({
  tag,
  pages: tag.pages,
}));

// eslint-disable-next-line import/prefer-default-export
export const TagPages = withDatabase(enhance(Pages));
