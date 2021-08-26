/* eslint no-console: off */
/* eslint prefer-destructuring: off */

import { types } from 'mobx-state-tree';
import { v4 as uuidv4 } from 'uuid';
import { Workspace } from './workspace';
import { ItemGroup } from './item-group';

const WorkspaceStore = types
  .model({
    id: types.identifier,
    workspaces: types.map(Workspace),
  })
  .volatile(() => ({
    snapshotPath: '',
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
  }));

export default WorkspaceStore;
