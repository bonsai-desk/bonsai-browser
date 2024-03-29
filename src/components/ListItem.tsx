import styled from 'styled-components';
import React from 'react';
import { observer } from 'mobx-react-lite';
import { Circle, CircleOutlined, Delete } from '@mui/icons-material';
import { Fade, Grid, IconButton, Tooltip, Typography } from '@mui/material';
import Favicon from './Favicon';
import { color } from '../utils/jsutils';
import { TagWithTitle } from '../watermelon/components/Tag';
import { useStore } from '../store/tab-page-store';
import EnhancedTags from '../watermelon/components/EnhancedTags';
import { trackOpenItem } from '../utils/tracking';
import { getBaseUrl } from '../utils/utils';

export interface IHomeListItem {
  title: string;
  description: string;
  favicon: string;
  active: boolean;
  url?: string;
  hideTags?: string[];
  noClickTags?: string[];
  // LED?: boolean;
  firstTag?: string;
  // clickLed?: () => void;
  led?: {
    clickLed?: () => void;
    tooltip: string;
    enabled: boolean;
  };
  extraButtons?: JSX.Element;
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

const LedCircle = () => {
  return (
    <CircleOutlined
      sx={{
        color: color('confirmation-color', 'opacity-high'),
        fontSize: '9px',
      }}
    />
  );
};

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
  left: 9px;
  top: 9px;
`;

const LEDContainer = styled.div`
  cursor: pointer;
  position: absolute;
  left: -30px;
  top: -10px;
  width: 26px;
  height: 35px;
  opacity: 0;

  :hover {
    opacity: 1;
  }
`;

const GoogItemParent = styled.div`
  font-family: Roboto, arial, sans-serif;
  width: 600px;
  margin: 0 0 0 28px;
  padding: 0 0 30px 0;
`;

const UrlParent = styled.div`
  margin: 0 0 2px 0;
  font-size: 14px;
  letter-spacing: 0.15px;
  width: 350px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

const GoogUrl = styled.span`
  color: var(--goog-domain);
`;

const BreadcrumbParent = styled.span`
  color: var(--goog-breadcrumb);
  position: relative;
`;

const Breadcrumbs = ({ crumbs }: { crumbs: string[] }) => {
  let chain = '';
  crumbs.forEach((crumb) => {
    chain += ` › ${crumb}`;
  });
  return <BreadcrumbParent>{chain}</BreadcrumbParent>;
};

const GoogBlueLink = styled(Typography)`
  font-size: 20px;
  color: var(--goog-link);
  cursor: pointer;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

const GoogDescription = styled.div`
  color: var(--goog-description);
  font-size: 14px;
`;

function getAllIndexes(arr: string, val: string) {
  const indexes = [];
  let i;
  for (i = 0; i < arr.length; i += 1) if (arr[i] === val) indexes.push(i);
  return indexes;
}

export const GoogListItem = observer(
  ({ title, description, active, url = '' }: IHomeListItem) => {
    const fullDescription =
      description === ''
        ? 'No information is available for this page.'
        : description;

    const choppedDescription =
      fullDescription.length > 155
        ? `${fullDescription.slice(0, 155)} ...`
        : fullDescription;

    const idxs = getAllIndexes(url, '/');
    const queryBegin = getAllIndexes(url, '?');
    if (queryBegin.length === 0) {
      queryBegin.push(url.length);
    }

    let processedUrl = url;
    let crumbs: string[] = [];
    if (idxs.length > 2) {
      processedUrl = url.slice(0, idxs[2]);
      crumbs = getBaseUrl(url)
        .slice(0, queryBegin[0])
        .slice(idxs[2])
        .split('/')
        .filter((crumb) => crumb)
        .map((crumb) => decodeURIComponent(crumb));
    }

    return (
      <div style={{ cursor: 'pointer' }}>
        <GoogItemParent>
          <UrlParent>
            <GoogUrl>{processedUrl}</GoogUrl>
            <Breadcrumbs crumbs={crumbs} />
          </UrlParent>
          <GoogBlueLink
            sx={{ textDecoration: active ? 'underline' : null }}
            fontSize="20px"
          >
            {title}
          </GoogBlueLink>
          <GoogDescription>{choppedDescription}</GoogDescription>
        </GoogItemParent>
      </div>
    );
  }
);

export const PageListItem = observer(
  ({
    title,
    favicon,
    active,
    url,
    hideTags = [],
    noClickTags = [],
    firstTag = '',
    extraButtons,
    led,
  }: IHomeListItem) => {
    const { tabPageStore } = useStore();

    const LED = led?.enabled || false;
    const clickLed = led?.clickLed;
    const tooltip = led?.tooltip || '';

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
              {!LED && clickLed ? (
                <Tooltip
                  title={tooltip}
                  placement="left"
                  TransitionComponent={Fade}
                >
                  <LEDContainer
                    onClick={(e) => {
                      e.stopPropagation();
                      if (clickLed) {
                        clickLed();
                      }
                    }}
                  >
                    <LEDParent>
                      <LedCircle />
                    </LEDParent>
                  </LEDContainer>
                </Tooltip>
              ) : (
                ''
              )}
              {LED ? (
                <Tooltip
                  title={tooltip}
                  placement="left"
                  TransitionComponent={Fade}
                >
                  <LEDContainer
                    style={{ opacity: 1 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (clickLed) {
                        clickLed();
                      }
                    }}
                  >
                    <LEDParent>
                      <Circle
                        sx={{
                          color: color('confirmation-color', 'opacity-high'),
                          fontSize: '9px',
                        }}
                      />
                    </LEDParent>
                  </LEDContainer>
                </Tooltip>
              ) : (
                ''
              )}
              <Favicon favicon={favicon} isFile={url?.startsWith('file:')} />
              <EnhancedTags
                hideTags={hideTags}
                firstTag={firstTag}
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
              <div
                style={{
                  height: '100%',
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignContent: 'center',
                  justifyContent: 'center',
                }}
              >
                {extraButtons}
              </div>
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
  margin: 0 0 0 -22px;
  overflow: visible;
  font-size: 16px;
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
