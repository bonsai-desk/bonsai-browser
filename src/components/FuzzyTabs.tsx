import { observer } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import styled from 'styled-components';
import { withDatabase } from '@nozbe/watermelondb/DatabaseProvider';
import { enhanceWithAllTagsAndPages } from '../watermelon/components/Tags';
import { ColumnContainer } from './Column';
import TagItemsFiltered from '../watermelon/components/TagItemsFiltered';
import { useStore } from '../store/tab-page-store';
import BackColumn from './BackColumn';

const FuzzyTitle = styled.h1`
  color: var(--body-text-color);
  //text-shadow: 0 0 5px #9c9c9c;
  margin: 0 36px 0 0;
  justify-content: center;
`;

export const AllTagItemsFiltered = withDatabase(
  enhanceWithAllTagsAndPages(TagItemsFiltered)
);

const FuzzyTabs = observer(() => {
  const { tabPageStore } = useStore();

  // useEffect(() => {
  //   ipcRenderer.send('log-data', 'effect');
  //   return () => {
  //     ipcRenderer.send('log-data', 'blur');
  //     runInAction(() => {
  //       tabPageStore.bonsaiBoxRef?.current?.blur();
  //     });
  //   };
  // }, [tabPageStore.bonsaiBoxRef]);

  useEffect(() => {
    const enterHandle = tabPageStore.registerKeybind('enter', () => {
      tabPageStore.handleEnter();
    });
    // bind('enter', () => {
    //   ipcRenderer.send('log-data', 'enter from fuzzy search');
    //   tabPageStore.handleEnter();
    // });
    return () => {
      tabPageStore.unregisterKeybind(enterHandle);
      // unbind('enter');
    };
  });

  return (
    <ColumnContainer
      MiniColumn={<BackColumn />}
      Header={<FuzzyTitle>Search</FuzzyTitle>}
      Left={<AllTagItemsFiltered filterText={tabPageStore.urlText} />}
    />
  );
});

export default FuzzyTabs;
