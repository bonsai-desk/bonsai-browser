import React from 'react';
import { ipcRenderer } from 'electron';
import { runInAction } from 'mobx';
import { IconButton } from '@mui/material';
import { Close, LocalOffer } from '@mui/icons-material';
import PageModel from '../watermelon/PageModel';
import { TabPageTab, tabTitle } from '../interfaces/tab';
import TabPageStore from '../store/tab-page-store';
import { PageListItem, TagListItem, TitleItem } from '../components/ListItem';
import TagModel from '../watermelon/TagModel';
import { ListItem, Trigger } from '../interface/ListItem';
import { getRootDomain } from './data';
import {
  Location,
  trackCloseGroup,
  trackClosePage,
  trackOpenItem,
} from './tracking';
import { baseUrl } from './utils';

function titleToItem(
  title: string,
  store: TabPageStore,
  location: Location,
  domainTabs?: TabPageTab[]
): ListItem {
  return {
    id: title,
    item: title,
    Node: ({ active }: { active: boolean }) => (
      <TitleItem title={title} active={active} />
    ),
    onClick: () => {},
    onTag: () => {},
    onIdChange: () => {
      store.blurBonsaiBox();
    },
    onLazyIdChange: () => {
      if (domainTabs && domainTabs[0]) {
        runInAction(() => {
          store.activeHomeTabId = domainTabs[0].id;
        });
      }
    },
    delete: {
      bounceOffEnd: true,
      onClick: (trigger) => {
        const keys = Object.keys(store.openTabs);
        ipcRenderer.send('mixpanel-track-with-props', [
          'click remove column in home',
          { num_tabs: keys.length },
        ]);
        const tabs: number[] = [];
        keys.forEach((key: string) => {
          const tab = store.openTabs[key];
          if (getRootDomain(tab.url) === title) {
            tabs.push(tab.id);
          }
        });
        ipcRenderer.send('remove-tabs', tabs);
        trackCloseGroup(trigger, location, 'active tab');
      },
    },
  };
}

function tabToItem(
  tab: TabPageTab,
  store: TabPageStore,
  LED = false,
  location: Location
): ListItem {
  function onTag() {
    runInAction(() => {
      store.selectedForTagTab = tab;
    });
    ipcRenderer.send('open-tag-modal');
  }

  function onDelete(trigger: Trigger) {
    ipcRenderer.send('remove-tab', tab.id);
    trackClosePage(trigger, 'active tab', location);
  }

  return {
    id: tab.id.toString(),
    item: tab,
    Node: ({ active }: { active: boolean }) => (
      <PageListItem
        active={active}
        url={tab.url}
        title={tabTitle(tab)}
        favicon={tab.favicon}
        extraButtons={
          active ? (
            <div>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onTag();
                }}
              >
                <LocalOffer sx={{ fontSize: '15px' }} />
              </IconButton>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete('mouse');
                }}
              >
                <Close sx={{ fontSize: '15px' }} />
              </IconButton>
            </div>
          ) : undefined
        }
        led={{ enabled: LED, clickLed: () => {}, tooltip: '' }}
      />
    ),
    onClick: (trigger) => {
      ipcRenderer.send('set-tab', tab.id);
      trackOpenItem(trigger, 'active tab', location);
    },
    delete: {
      bounceOffEnd: true,
      onClick: onDelete,
    },
    onTag: () => {
      onTag();
    },
    onIdChange: () => {
      store.blurBonsaiBox();
      store.setHighlightedTabId(tab.id);
    },
    onLazyIdChange: () => {
      runInAction(() => {
        store.activeHomeTabId = tab.id;
      });
    },
  };
}

export function pagesToItems(
  store: TabPageStore,
  pages: PageModel[],
  location: Location,
  parentTag?: TagModel
): ListItem[] {
  // page id to tab id
  const pageIdToTabId: Record<string, number> = {};

  Object.values(store.openTabs).forEach((tab) => {
    const pageMatch = pages.find(
      (page) => baseUrl(page.url) === baseUrl(tab.url)
    );
    if (typeof pageMatch !== 'undefined') {
      pageIdToTabId[pageMatch.id] = tab.id;
    }
  });

  const ledEnabled = (pageId: string) => {
    const match = pageIdToTabId[pageId];
    return !!match;
  };

  return pages.map((page) => {
    const tabId = pageIdToTabId[page.id];
    const tabMatch = typeof tabId !== 'undefined';
    const pageIsOpen = store.tabWithUrlOpen(page.url);

    const altClick = (trigger: Trigger) => {
      ipcRenderer.send('create-tab-without-set', page.url);
      trackOpenItem(trigger, 'saved page', location, 'alt');
    };

    const onDelete = () => {
      ipcRenderer.send('remove-tab', tabId);
    };

    const clickLed = () => {
      if (ledEnabled(page.id)) {
        onDelete();
      } else {
        altClick('mouse');
      }
    };

    const led = {
      clickLed,
      tooltip: ledEnabled(page.id) ? 'w' : 'shift+enter',
      enabled: ledEnabled(page.id),
    };

    function onTag() {
      runInAction(() => {
        store.selectedForTagTab = page;
      });
      ipcRenderer.send('open-tag-modal');
    }

    return {
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
          firstTag={parentTag ? parentTag.title : undefined}
          noClickTags={parentTag ? [parentTag.title] : undefined}
          led={led}
          extraButtons={
            active ? (
              <div>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTag();
                  }}
                >
                  <LocalOffer sx={{ fontSize: '15px' }} />
                </IconButton>
              </div>
            ) : undefined
          }
        />
      ),
      onClick: (trigger) => {
        ipcRenderer.send('open-workspace-url', page.url);
        trackOpenItem(trigger, 'saved page', location);
      },
      onAltClick: !pageIsOpen ? altClick : undefined,
      onTag,
      onIdChange: () => {
        store.setHighlightedTabId(page.id);
      },
      onLazyIdChange: () => {
        runInAction(() => {
          store.activeListPage = page;
        });
      },
      delete: tabMatch
        ? {
            bounceOffEnd: false,
            onClick: onDelete,
          }
        : undefined,
    };
  });
}

export function tabsToItems(
  store: TabPageStore,
  tabs: TabPageTab[],
  LED = false,
  location: Location
): ListItem[] {
  return tabs.map((tab) => tabToItem(tab, store, LED, location));
}

type Domain = string;

export function tabsToItemsByDomain(
  store: TabPageStore,
  tabs: TabPageTab[],
  LED = false,
  location: Location
): ListItem[] {
  const domains: Record<Domain, TabPageTab[]> = {};

  tabs.forEach((tab) => {
    domains[getRootDomain(tab.url)] = domains[getRootDomain(tab.url)] || [];
    domains[getRootDomain(tab.url)].push(tab);
  });

  const domainsList = Object.entries(domains);

  const order: Record<number, number> = {};

  store.tabBumpOrder.forEach((id, idx) => {
    order[id] = idx;
  });

  domainsList.forEach(([_, domainTabs]) => {
    domainTabs.sort((a, b) => {
      const aIdx = order[a.id];
      const bIdx = order[b.id];
      if (aIdx < bIdx) {
        return -1;
      }
      if (aIdx > bIdx) {
        return 1;
      }
      return 0;
    });
  });

  domainsList.sort((a, b) => {
    const aFirstIdx = order[a[1][0].id];
    const bFirstIdx = order[b[1][0].id];
    if (aFirstIdx < bFirstIdx) {
      return -1;
    }
    if (aFirstIdx > bFirstIdx) {
      return 1;
    }
    return 0;
  });

  const items: ListItem[] = [];

  domainsList.forEach(([domain, domainTabs]) => {
    items.push(titleToItem(domain, store, location, domainTabs));
    domainTabs.forEach((tab) => {
      items.push(tabToItem(tab, store, LED, location));
    });
  });

  return items;
}

// export function tabsToItemsSplitTags(
//   store: TabPageStore,
//   tabs: TabPageTab[],
//   counts: number[]
// ) {
//   const unTaggedItems: ListItem[] = [];
//   const taggedItems: ListItem[] = [];
//
//   const order: Record<number, number> = {};
//   const numTags: Record<number, number> = {};
//
//   store.tabBumpOrder.forEach((id, idx) => {
//     order[id] = idx;
//   });
//
//   tabs.forEach((tab, idx) => {
//     numTags[tab.id] = counts[idx];
//   });
//
//   tabs.sort((a, b) => {
//     const aIdx = order[a.id];
//     const bIdx = order[b.id];
//     if (aIdx < bIdx) {
//       return -1;
//     }
//     if (aIdx > bIdx) {
//       return 1;
//     }
//     return 0;
//   });
//
//   tabs.forEach((tab) => {
//     if (numTags[tab.id] > 0) {
//       taggedItems.push(tabToItem(tab, store));
//     } else {
//       unTaggedItems.push(tabToItem(tab, store));
//     }
//   });
//
//   return unTaggedItems.concat(taggedItems);
// }

export function tagsToItems(
  store: TabPageStore,
  tags: TagModel[],
  location: Location,
  onDelete?: (tag: TagModel) => void,
  counts?: number[]
): ListItem[] {
  const countsExist = typeof counts !== 'undefined';
  return tags.map((tag, idx) => ({
    id: tag.id,
    item: tag,
    Node: ({ active }: { active: boolean }) => (
      <TagListItem
        active={active}
        key={tag.id}
        title={tag.title}
        count={countsExist ? counts[idx] : undefined}
        onDelete={
          onDelete
            ? () => {
                onDelete(tag);
              }
            : undefined
        }
      />
    ),
    onClick: (trigger) => {
      trackOpenItem(trigger, 'tag', location);
      store.setViewingTag(tag);
    },
    onIdChange: () => {
      store.setHighlightedTabId(tag.id);
    },
    onLazyIdChange: () => {
      runInAction(() => {
        store.activeHomeTabId = tag.id;
      });
    },
  }));
}
