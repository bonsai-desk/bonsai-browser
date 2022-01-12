import styled from 'styled-components';
import React from 'react';
import { observer } from 'mobx-react-lite';
import { Circle, Delete } from '@mui/icons-material';
import { Grid, IconButton } from '@mui/material';
import Favicon from './Favicon';
import { color } from '../utils/jsutils';
import { TagWithTitle } from '../watermelon/components/Tag';
import { useStore } from '../store/tab-page-store';
import EnhancedTags from '../watermelon/components/EnhancedTags';
import { trackOpenItem } from '../utils/tracking';

export interface IHomeListItem {
  title: string;
  favicon: string;
  active: boolean;
  url?: string;
  hideTags?: string[];
  noClickTags?: string[];
  LED?: boolean;
}

export interface ITagListItem {
  title: string;
  active: boolean;
  onDelete?: () => void;
  count?: number;
}

const ListItemParent = styled.div`
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  align-content: center;
  justify-content: space-between;
  position: relative;
`;

const HomeListItemParent = styled(ListItemParent)`
  height: 35px;
`;

const TagListItemParent = styled(ListItemParent)`
  //height: 35px;
  padding: 12px 0 12px 0;
`;

const Row = styled.div`
  width: 100%;
  padding: 0 0 0 36px;
  position: relative;
  display: flex;
  flex-wrap: wrap;
`;

const SelectedIndicator = styled.div`
  background-color: var(--link-color);
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: 3px;
`;

const PageSelectedIndicator = styled(SelectedIndicator)``;

const InnerParent = styled.div`
  width: calc(100%);
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-content: center;
`;

const TabInnerParent = styled(InnerParent)`
  height: 19px;
`;

const FavTitle = styled.div`
  height: 16px;
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-content: center;
  font-size: 12px;
  //overflow: hidden;
`;
const Title = styled.div`
  color: ${color('body-text-color')};
  height: 15px;
  margin: -1px 0 0 16px;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const TagListItem = ({
  title,
  active,
  onDelete,
  count,
}: ITagListItem) => {
  return (
    <TagListItemParent
      style={{
        backgroundColor: active
          ? color('canvas-border-color', 'opacity-med')
          : '',
      }}
    >
      {active ? <PageSelectedIndicator /> : ''}
      <Row>
        <Grid container spacing={1}>
          <Grid item xs>
            <TagWithTitle
              tagTitle={title}
              onClick={() => {
                /* fake on click to make cursor a pointer */
              }}
            />
          </Grid>
          <Grid item xs>
            {typeof count !== 'undefined'
              ? `${count} page${count === 1 ? '' : 's'} with this tag`
              : null}
          </Grid>
          <Grid item xs>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'flex-end',
                height: '100%',
              }}
            >
              <div
                style={{
                  height: '20px',
                  margin: 'auto 48px auto 0',
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignContent: 'center',
                }}
              >
                {active && onDelete ? (
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                    }}
                  >
                    <Delete />
                  </IconButton>
                ) : null}
              </div>
            </div>
          </Grid>
        </Grid>
      </Row>
    </TagListItemParent>
  );
};

const LEDParent = styled.div`
  position: absolute;
  left: -21px;
  top: -1px;
`;

export const PageListItem = observer(
  ({
    title,
    favicon,
    active,
    url,
    hideTags = [],
    noClickTags = [],
    LED = false,
  }: IHomeListItem) => {
    const { tabPageStore } = useStore();

    return (
      <HomeListItemParent
        style={{
          backgroundColor: active
            ? color('canvas-border-color', 'opacity-med')
            : '',
        }}
      >
        {active ? <PageSelectedIndicator /> : ''}
        <Row>
          <TabInnerParent>
            <FavTitle style={{ width: 'calc(100% - 12px)' }}>
              {LED ? (
                <LEDParent>
                  <Circle
                    sx={{
                      color: color('confirmation-color', 'opacity-high'),
                      fontSize: '9px',
                    }}
                  />
                </LEDParent>
              ) : (
                ''
              )}
              <Favicon favicon={favicon} />
              <EnhancedTags
                hideTags={hideTags}
                pageUrl={url || ''}
                onClick={(tag) => {
                  if (noClickTags && noClickTags.includes(tag.title)) {
                    return;
                  }

                  trackOpenItem('mouse', 'tag');
                  tabPageStore.setViewingTag(tag);
                }}
              />
              <Title>{title}</Title>
            </FavTitle>
          </TabInnerParent>
        </Row>
      </HomeListItemParent>
    );
  }
);

const DomainTitle = styled(Title)`
  //text-decoration: underline;
  font-weight: bold;
  margin: 0 0 0 0;
  overflow: visible;
`;

export const TitleItem = ({
  title,
  active,
}: {
  title: string;
  active: boolean;
}) => {
  return (
    <HomeListItemParent
      style={{
        backgroundColor: active
          ? color('canvas-border-color', 'opacity-med')
          : '',
      }}
    >
      {active ? <PageSelectedIndicator /> : ''}
      <Row>
        <TabInnerParent>
          <FavTitle style={{ width: 'calc(100% - 12px)' }}>
            <DomainTitle>{title}</DomainTitle>
          </FavTitle>
        </TabInnerParent>
      </Row>
    </HomeListItemParent>
  );
};
