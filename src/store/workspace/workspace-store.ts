/* eslint no-console: off */
/* eslint prefer-destructuring: off */

import { types } from 'mobx-state-tree';
import { v4 as uuidv4 } from 'uuid';
import { Workspace } from './workspace';
import { ItemGroup } from './item-group';
import { TabPageTab } from '../../interfaces/tab';

const WorkspaceStore = types
  .model({
    workspaces: types.map(Workspace),
  })
  .volatile(() => ({
    snapshotPath: '',
    chooseWorkspaceX: 0,
    chooseWorkspaceY: 0,
    activeWorkspaceId: '',
    selectedTab: { url: '', title: '', image: '', favicon: '' },
  }))
  .actions((self) => ({
    createWorkspace(name: string) {
      const workspace = Workspace.create({
        id: uuidv4(),
        name,
        hiddenGroup: ItemGroup.create({
          id: 'hidden',
          title: 'hidden',
          itemArrangement: [],
          zIndex: 0,
        }),
        inboxGroup: ItemGroup.create({
          id: 'inbox',
          title: 'inbox',
          itemArrangement: [],
          zIndex: 0,
        }),
        groups: {},
        items: {},
      });
      self.workspaces.put(workspace);
    },
    setSnapshotPath(snapshotPath: string) {
      self.snapshotPath = snapshotPath;
    },
    setChooseWorkspacePos(x: number, y: number) {
      self.chooseWorkspaceX = x;
      self.chooseWorkspaceY = y;
    },
    setActiveWorkspaceId(activeWorkspaceId: string) {
      self.activeWorkspaceId = activeWorkspaceId;
    },
    setSelectedTab(selectedTab: TabPageTab) {
      self.selectedTab = selectedTab;
    },
  }));

export default WorkspaceStore;
