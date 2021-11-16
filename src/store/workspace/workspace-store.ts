/* eslint no-console: off */
/* eslint prefer-destructuring: off */

import { destroy, Instance, types } from 'mobx-state-tree';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { Workspace } from './workspace';
import { ItemGroup } from './item-group';
import { TabPageTab } from '../../interfaces/tab';

const WorkspaceStore = types
  .model({
    version: types.number,
    workspaces: types.map(Workspace),
  })
  .volatile(() => ({
    snapshotPath: '',
    dataPath: '',
    attemptedToLoadSnapshot: false,
    chooseWorkspaceX: 0,
    chooseWorkspaceY: 0,
    activeWorkspaceId: '',
    selectedTab: { url: '', title: '', image: '', favicon: '' },
  }))
  .actions((self) => ({
    createWorkspace(name: string): Instance<typeof Workspace> {
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
      return workspace;
    },
    setVersion(version: number) {
      self.version = version;
    },
    setSnapshotPath(snapshotPath: string) {
      self.snapshotPath = snapshotPath;
    },
    setDataPath(dataPath: string) {
      self.dataPath = dataPath;
    },
    setAttemptedToLoadSnapshot(attemptedToLoadSnapshot: boolean) {
      self.attemptedToLoadSnapshot = attemptedToLoadSnapshot;
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
    deleteWorkspace(workspace: Instance<typeof Workspace>) {
      // delete all item images
      workspace.items.forEach((item) => {
        try {
          fs.rmSync(path.join(self.dataPath, 'images', `${item.image}.jpg`));
        } catch {
          //
        }
      });
      destroy(workspace);
    },
  }));

export type IWorkSpaceStore = Instance<typeof WorkspaceStore>;

export default WorkspaceStore;
