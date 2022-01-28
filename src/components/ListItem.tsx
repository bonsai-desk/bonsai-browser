import styled from 'styled-components';
import React from 'react';
import { observer } from 'mobx-react-lite';
import { Circle, CircleOutlined, Delete } from '@mui/icons-material';
import {
  Fade,
  Grid,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
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
  // LED?: boolean;
  firstTag?: string;
  // clickLed?: () => void;
  led?: {
    clickLed: () => void;
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
  cursor: pointer;
`;

const UrlParent = styled.div`
  margin: 0 0 2px 0;
  font-size: 14px;
  letter-spacing: 0.15px;
  width: 350px;
`;

const GoogUrl = styled.div`
  color: #202124;
`;

const BreadcrumbParent = styled.div`
  color: #5f6368;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
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
  color: #1a0dab;
  cursor: pointer;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

const GoogDescription = styled.div`
  color: #4d5156;
  font-size: 14px;
`;

function getAllIndexes(arr: string, val: string) {
  const indexes = [];
  let i;
  for (i = 0; i < arr.length; i += 1) if (arr[i] === val) indexes.push(i);
  return indexes;
}

// const GoogListItem = ({
//   title,
//   url,
//   description,
//   active = false,
// }: {
//   url: string;
//   title: string;
//   description: string;
//   active?: boolean;
// }) => {
//   const choppedDescription =
//     description.length > 155 ? `${description.slice(0, 155)} ...` : description;
//
//   const idxs = getAllIndexes(url, '/');
//   const queryBegin = getAllIndexes(url, '?');
//   if (queryBegin.length === 0) {
//     queryBegin.push(url.length);
//   }
//
//   let processedUrl = url;
//   let crumbs: string[] = [];
//   if (idxs.length > 2) {
//     processedUrl = url.slice(0, idxs[2]);
//     crumbs = url
//       .slice(0, queryBegin[0])
//       .slice(idxs[2])
//       .split('/')
//       .filter((crumb) => crumb);
//   }
//
//   return (
//     <GoogItemParent>
//       <UrlParent>
//         <Stack direction="row" spacing={0}>
//           <GoogUrl>{processedUrl}</GoogUrl>
//           <Breadcrumbs crumbs={crumbs} />
//         </Stack>
//       </UrlParent>
//       <GoogBlueLink
//         sx={{ textDecoration: active ? 'underline' : null }}
//         fontSize="20px"
//       >
//         {title}
//       </GoogBlueLink>
//       <GoogDescription>{choppedDescription}</GoogDescription>
//     </GoogItemParent>
//   );
// };

export const GoogListItem = observer(
  ({
    title,
    favicon,
    active,
    url = '',
    hideTags = [],
    noClickTags = [],
    firstTag = '',
    extraButtons,
    led,
  }: IHomeListItem) => {
    const { tabPageStore } = useStore();

    // const LED = led?.enabled || false;
    // const clickLed = led?.clickLed;
    // const tooltip = led?.tooltip || '';

    const description =
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Cras venenatis non ligula sit amet porta. Vestibulum venenatis nisi ex, eu iaculis est rhoncus sed. Quisque ac felis maximus, faucibus arcu et, consectetur purus. Etiam ultricies ipsum et posuere tempor. Sed urna nulla, dignissim in diam sed, maximus vehicula est. Etiam eget sem et ligula semper pellentesque. Cras convallis viverra finibus. Aliquam dolor nunc, fermentum sit amet sodales non, sodales sit amet neque. Morbi malesuada massa at elit molestie, nec eleifend quam mollis. Nunc et mauris molestie, vestibulum diam in, aliquam justo. Cras volutpat elit ipsum, at iaculis libero tristique gravida. Nullam faucibus eros non enim porta elementum. Maecenas non ligula tincidunt, posuere nunc id, ornare metus. Nullam sit amet lobortis tellus. Phasellus neque ex, vulputate semper feugiat non, tincidunt sed leo. Nullam id luctus risus, non semper eros.';

    const choppedDescription =
      description.length > 155
        ? `${description.slice(0, 155)} ...`
        : description;

    const idxs = getAllIndexes(url, '/');
    const queryBegin = getAllIndexes(url, '?');
    if (queryBegin.length === 0) {
      queryBegin.push(url.length);
    }

    let processedUrl = url;
    let crumbs: string[] = [];
    if (idxs.length > 2) {
      processedUrl = url.slice(0, idxs[2]);
      crumbs = url
        .slice(0, queryBegin[0])
        .slice(idxs[2])
        .split('/')
        .filter((crumb) => crumb);
    }

    return (
      <GoogItemParent>
        <UrlParent>
          <Stack direction="row" spacing={0}>
            <GoogUrl>{processedUrl}</GoogUrl>
            <Breadcrumbs crumbs={crumbs} />
          </Stack>
        </UrlParent>
        <GoogBlueLink
          sx={{ textDecoration: active ? 'underline' : null }}
          fontSize="20px"
        >
          {title}
        </GoogBlueLink>
        <GoogDescription>{choppedDescription}</GoogDescription>
      </GoogItemParent>
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
                      <CircleOutlined
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
