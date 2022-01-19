import { withDatabase } from '@nozbe/watermelondb/DatabaseProvider';
import styled from 'styled-components';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { Stack } from '@mui/material';
import { color } from '../../utils/jsutils';
import TagModel from '../TagModel';
import Tag from './Tag';
import { enhancePageFromUrlWithTags } from './Tags';

const TagsRowParent = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-content: center;
  color: ${color('body-text-color')};
  height: 15px;
  margin: 1px 0 0 16px;
`;
const TagsRow: React.FC<{
  tags: TagModel[];
  hideTags: string[];
  onClick?: (tag: TagModel) => void;
  firstTag?: string;
}> = observer(({ tags, hideTags, onClick, firstTag = '' }) => {
  const filteredTags = tags.filter((tag) => !hideTags.includes(tag.title));
  if (filteredTags.length === 0) {
    return null;
  }
  filteredTags.sort((a, b) => {
    return a.title.localeCompare(b.title);
  });

  if (firstTag) {
    const firstTagIdx = filteredTags.findIndex((tag) => tag.title === firstTag);
    if (firstTagIdx !== -1) {
      const first = filteredTags.splice(firstTagIdx, 1);
      filteredTags.splice(0, 0, first[0]);
    }
  }

  return (
    <TagsRowParent>
      <Stack direction="row" spacing={1}>
        {filteredTags.map((tag) => {
          return (
            <div key={tag.id}>
              <Tag
                tag={tag}
                size="small"
                onClick={
                  onClick
                    ? (e) => {
                        e.stopPropagation();
                        onClick(tag);
                      }
                    : undefined
                }
              />
            </div>
          );
        })}
      </Stack>
    </TagsRowParent>
  );
});

const EnhancedTags = withDatabase(enhancePageFromUrlWithTags(TagsRow));

export default EnhancedTags;
