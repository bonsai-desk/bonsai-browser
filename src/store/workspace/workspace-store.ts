/* eslint no-console: off */
/* eslint prefer-destructuring: off */

import { destroy, Instance, types } from 'mobx-state-tree';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { Workspace } from './workspace';
import { ItemGroup } from './item-group';
import { TabPageTab } from '../../interfaces/tab';

// const Tag = types.model({
//   id: types.identifier,
//   title: types.string,
// });
//
// const Page = types.model({
//   id: types.identifier,
//   url: types.string,
//   tags: types.map(types.reference(Tag)),
// });

const WorkspaceStore = types
  .model({
    version: types.number,
    workspaces: types.map(Workspace),

    // tags: types.map(Tag),
    // pages: types.map(Page),
    // tags: types.map(types.map(types.boolean)),
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
    addTag(baseUrl: string, tag: string) {
      // if (!self.tags.has(baseUrl)) {
      //   self.tags.set(baseUrl, {});
      // }
      // self.tags.get(baseUrl)?.set(tag, true);
    },
    removeTag(baseUrl: string, tag: string) {
      // if (!self.tags.has(baseUrl)) {
      //   return;
      // }
      // self.tags.get(baseUrl)?.delete(tag);
    },
  }));

export type IWorkSpaceStore = Instance<typeof WorkspaceStore>;

export default WorkspaceStore;
