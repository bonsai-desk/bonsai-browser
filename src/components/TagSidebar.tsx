import styled from 'styled-components';
import React, { useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';
import { ipcRenderer } from 'electron';
import { tagSideBarWidth } from '../constants';
import { useStore, View } from '../store/tab-page-store';
import { baseUrl } from '../utils/utils';

const Bounds = styled.div`
  position: absolute;
  background-color: white;
  z-index: 1;
  border-radius: 10px 0 0 0;
  color: black;
`;

const Border = styled.div`
  width: calc(100% - 1px);
  height: 100%;
  border-right: 1px solid gray;
`;

const PageTitle = styled.div`
  font-size: 1.5rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 5px;
`;

const Divider = styled.div`
  width: calc(100% - 10px);
  margin-left: 5px;
  height: 2px;
  background-color: gray;
`;

const Title = styled.div`
  font-size: 1.5rem;
  padding: 5px 5px 5px 15px;
`;

const TagSearch = styled.input`
  margin: 0 15px 0 15px;
  width: calc(100% - 30px - 30px);
  padding: 3px 15px 3px 15px;
  font-size: 1.5rem;
  border-radius: 9999999px;
  border: 1px solid black;
  outline: none;
`;

const AddTagButton = styled.button`
  font-size: 1rem;
  border-radius: 9999999px;
  border: 2px solid black;
  margin: 10px 0 10px 15px;

  :hover {
    filter: brightness(0.8);
  }
`;

const Tag = styled.div`
  background-color: #2121e8;
  color: white;

  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  padding: 0 10px 0 10px;
  margin: 0 0 0 25px;
  border-radius: 99999px;
  width: calc(100% - 50px - 20px);

  cursor: pointer;
  :hover {
    filter: brightness(0.8);
  }
`;

const TagSidebar = observer(() => {
  const { tabPageStore, historyStore, workspaceStore } = useStore();

  const tab = tabPageStore.openTabs[historyStore.active];
  let title = 'New Tab';
  let tabBaseUrl = '';
  if (tab) {
    title = tab.title;
    tabBaseUrl = baseUrl(tab.url);
  }

  const tagBoxRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    tabPageStore.tagBoxRef = tagBoxRef;
  }, [tabPageStore]);

  // const tagsMap = workspaceStore.tags.get(tabBaseUrl);
  // let tags: string[] = [];
  // if (tagsMap) {
  //   tags = Array.from(tagsMap.keys());
  // }

  return (
    <Bounds
      style={{
        left: tabPageStore.innerBounds.x,
        top: tabPageStore.innerBounds.y,
        width: tagSideBarWidth,
        height: tabPageStore.innerBounds.height,
      }}
    >
      <Border>
        <PageTitle>{title === '' ? 'New Tab' : title}</PageTitle>
        <Divider />
        <Title>Add Tag:</Title>
        <TagSearch
          ref={tagBoxRef}
          onFocus={() => {
            runInAction(() => {
              tabPageStore.tagBoxFocus = true;
            });
          }}
          onBlur={() => {
            runInAction(() => {
              tabPageStore.tagBoxFocus = false;
            });
          }}
        />
        <AddTagButton
          onClick={() => {
            if (tagBoxRef.current) {
              const tag = tagBoxRef.current.value.trim();
              if (tag !== '') {
                workspaceStore.addTag(tabBaseUrl, tag);
              }
            }
          }}
        >
          Add Tag
        </AddTagButton>
        <Divider />
        <Title>Tags:</Title>
        {/* {tags.map((tag) => { */}
        {/*  return ( */}
        {/*    <div key={tag}> */}
        {/*      <Tag */}
        {/*        onClick={() => { */}
        {/*          tabPageStore.View = View.Tag; */}
        {/*          ipcRenderer.send('click-main'); */}
        {/*        }} */}
        {/*      > */}
        {/*        {tag} */}
        {/*      </Tag> */}
        {/*      <AddTagButton */}
        {/*        style={{ marginLeft: 30, marginTop: 2 }} */}
        {/*        onClick={() => { */}
        {/*          workspaceStore.removeTag(tabBaseUrl, tag); */}
        {/*        }} */}
        {/*      > */}
        {/*        X */}
        {/*      </AddTagButton> */}
        {/*    </div> */}
        {/*  ); */}
        {/* })} */}
        <Divider />
        <Title>Related Tags:</Title>
      </Border>
    </Bounds>
  );
});

export default TagSidebar;
