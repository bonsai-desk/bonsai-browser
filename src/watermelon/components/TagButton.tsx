import React, { useEffect, useState } from 'react';
import { withDatabase } from '@nozbe/watermelondb/DatabaseProvider';
import { observer } from 'mobx-react-lite';
import { Badge, Tooltip } from '@mui/material';
import { LocalOffer } from '@material-ui/icons';
import { combineLatestWith } from 'rxjs';
import { Q } from '@nozbe/watermelondb';
import TagModel from '../TagModel';
import { enhancePageFromUrlWithTags } from './Tags';
import { BigButton } from '../../components/Buttons';
import { useStore } from '../../store/tab-page-store';
import { TableName } from '../schema';
import { getBaseUrl } from '../../utils/utils';
import { View } from '../../constants';

const Button: React.FC<{
  tags: TagModel[];
  onClick?: () => void;
}> = observer(({ tags, onClick }) => {
  const { tabPageStore, database, historyStore, keybindStore } = useStore();

  const tagButtonActive = tabPageStore.View === View.Navigator;
  const [tagTooltip, setTagTooltip] = useState(false);

  useEffect(() => {
    if (!tagButtonActive) {
      setTagTooltip(false);
    }
  }, [tagButtonActive]);

  const hasTags = tags.length > 0;

  const tab = tabPageStore.openTabs[historyStore.active];
  let tabBaseUrl = '';
  if (tab) {
    tabBaseUrl = getBaseUrl(tab.url);
  }
  if (tabPageStore.View !== View.Navigator && tabPageStore.selectedForTagTab) {
    tabBaseUrl = getBaseUrl(tabPageStore.selectedForTagTab.url);
  }

  const [queryData, setQueryData] = useState<
    { checked: boolean; title: string }[]
  >([]);

  // this entire mess should just be imperative

  useEffect(() => {
    const allTagsObserved = database
      .get<TagModel>(TableName.TAGS)
      .query()
      .observe();
    const pageFromUrlTagsObserved = database
      .get<TagModel>(TableName.TAGS)
      .query(
        Q.experimentalNestedJoin(TableName.PAGETAGS, TableName.PAGES),
        Q.on(TableName.PAGETAGS, Q.on(TableName.PAGES, 'url', tabBaseUrl))
      )
      .observe();
    const subscription = allTagsObserved
      .pipe(combineLatestWith(pageFromUrlTagsObserved))
      .subscribe({
        next: ([allTags, pageTags]) => {
          const pageTagTitles = pageTags.map((tag) =>
            tag.title.toLocaleLowerCase()
          );
          const allTagTitles = allTags.map((tag) => tag.title).sort();
          const result = allTagTitles.map((title) => {
            return {
              checked: pageTagTitles.includes(title.toLocaleLowerCase()),
              title,
            };
          });

          const sortedResult: { checked: boolean; title: string }[] = [];
          result.forEach((entry) => {
            if (entry.title !== tabPageStore.recentlyCreatedTagTitle) {
              if (entry.title in tabPageStore.recentlyUsedTagOldCheckedValue) {
                if (tabPageStore.recentlyUsedTagOldCheckedValue[entry.title]) {
                  sortedResult.push(entry);
                }
              } else if (entry.checked) {
                sortedResult.push(entry);
              }
            }
          });
          const numTagged = sortedResult.length;
          result.forEach((entry) => {
            if (entry.title !== tabPageStore.recentlyCreatedTagTitle) {
              if (entry.title in tabPageStore.recentlyUsedTagOldCheckedValue) {
                if (!tabPageStore.recentlyUsedTagOldCheckedValue[entry.title]) {
                  sortedResult.push(entry);
                }
              } else if (!entry.checked) {
                sortedResult.push(entry);
              }
            }
          });
          result.forEach((entry) => {
            if (entry.title === tabPageStore.recentlyCreatedTagTitle) {
              sortedResult.push(entry);
            }
          });
          for (let i = 0; i < sortedResult.length; i += 1) {
            if (
              sortedResult[i].title === tabPageStore.recentlyUsedModalTagTitle
            ) {
              const oldCheckedValue =
                tabPageStore.recentlyUsedTagOldCheckedValue[
                  sortedResult[i].title
                ];
              let checkedValue = sortedResult[i].checked;
              if (typeof oldCheckedValue !== 'undefined') {
                checkedValue = oldCheckedValue;
              }
              const goToIndex = checkedValue ? 0 : numTagged;
              const item = sortedResult.splice(i, 1)[0];
              sortedResult.splice(goToIndex, 0, item);
              break;
            }
          }
          setQueryData(sortedResult);
        },
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [
    database,
    tabBaseUrl,
    tabPageStore.recentlyCreatedTagTitle,
    tabPageStore.recentlyUsedTagOldCheckedValue,
    tabPageStore.recentlyUsedModalTagTitle,
  ]);

  useEffect(() => {
    let perfectMatch = false;
    const tagListInfo: { checked: boolean; title: string }[] = [];
    const inputLower = tabPageStore.tagModalInput.trim().toLocaleLowerCase();
    queryData.forEach((entry) => {
      const titleLower = entry.title.toLocaleLowerCase();
      if (titleLower === inputLower) {
        perfectMatch = true;
        if (
          titleLower !==
          tabPageStore.recentlyCreatedTagTitle.toLocaleLowerCase()
        ) {
          tagListInfo.unshift(entry);
        } else {
          tagListInfo.push(entry);
        }
      } else if (titleLower.includes(inputLower)) {
        tagListInfo.push(entry);
      }
    });

    tabPageStore.tagModalData.allowCreateNewTag =
      !perfectMatch && inputLower !== '';

    tabPageStore.tagModalData.tagListInfo = tagListInfo;
    tabPageStore.sendTagModalData();
  }, [queryData, tabPageStore]);

  const manage = keybindStore.binds.get('add-tag');
  const manageString = `${manage?.showCode()}`;

  return (
    <Tooltip
      title={manageString}
      open={tagTooltip}
      disableHoverListener
      onMouseEnter={() => {
        if (tagButtonActive) {
          setTagTooltip(true);
        }
      }}
      onMouseLeave={() => {
        setTagTooltip(false);
      }}
    >
      <Badge
        badgeContent={tags.length}
        color="primary"
        overlap="circular"
        invisible={!tagButtonActive || !hasTags}
      >
        <BigButton
          className="is-active"
          disabled={!tagButtonActive}
          onClick={() => {
            setTagTooltip(false);
            if (onClick) {
              onClick();
            }
          }}
        >
          <LocalOffer />
        </BigButton>
      </Badge>
    </Tooltip>
  );
});

const TagButton = withDatabase(enhancePageFromUrlWithTags(Button));

export default TagButton;
