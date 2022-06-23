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
  // .views((self) => ({
  //   getTagOrCreate(tagTitle: string): Instance<typeof Tag> {
  //     const tags = Array.from(self.tags.values());
  //     const tagIndex = tags.findIndex((tag) => tag.title === tagTitle);
  //     const id = tags[tagIndex]?.id;
  //     let tag = self.tags.get(id);
  //     if (!tag) {
  //       tag = self.tags.put(Tag.create({ id: uuidv4(), title: tagTitle }));
  //     }
  //     return tag;
  //   },
  //   getPage(baseUrl: string): Instance<typeof Page> | null {
  //     const pages = Array.from(self.pages.values());
  //     const pageIndex = pages.findIndex((page) => page.url === baseUrl);
  //     const id = pages[pageIndex]?.id;
  //     const page = self.pages.get(id);
  //     if (!page) {
  //       return null;
  //     }
  //     return page;
  //   },
  //   getPageOrCreate(baseUrl: string): Instance<typeof Page> {
  //     let page = this.getPage(baseUrl);
  //     if (!page) {
  //       page = self.pages.put(
  //         Page.create({ id: uuidv4(), url: baseUrl, tags: {} })
  //       );
  //     }
  //     return page;
  //   },
  // }))
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

export default WorkspaceStore;
