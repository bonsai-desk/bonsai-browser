/* eslint no-console: off */
/* eslint prefer-destructuring: off */

import { applySnapshot, getSnapshot, Instance } from 'mobx-state-tree';
import { ipcRenderer } from 'electron';
import fs from 'fs';
import { Item } from './item';
import { ItemGroup } from './item-group';
import WorkspaceStore from './workspace-store';
import { decrypt, encrypt } from '../../utils/utils';

const animationTime = 0.15;

function saveSnapshot(workspaceStore: Instance<typeof WorkspaceStore>) {
  if (workspaceStore.snapshotPath !== '') {
    try {
      const snapshot = getSnapshot(workspaceStore);
      const snapshotString = JSON.stringify(snapshot);
      fs.writeFileSync(workspaceStore.snapshotPath, encrypt(snapshotString));
    } catch {
      //
    }
  }
}

function loadSnapshot(workspaceStore: Instance<typeof WorkspaceStore>) {
  if (workspaceStore.snapshotPath !== '') {
    try {
      const workspaceJson = fs.readFileSync(
        workspaceStore.snapshotPath,
        'utf8'
      );
      if (workspaceJson !== '') {
        const workspaceSnapshot = JSON.parse(decrypt(workspaceJson));
        applySnapshot(workspaceStore, workspaceSnapshot);
      }
    } catch {
      //
    }
  }
}

function animateItem(item: Instance<typeof Item>, deltaTime: number) {
  if (item.animationLerp !== 1) {
    item.setAnimationLerp(item.animationLerp + deltaTime * (1 / animationTime));
    if (item.animationLerp > 1) {
      item.setAnimationLerp(1);
    }
  }
}

function animateGroup(group: Instance<typeof ItemGroup>, deltaTime: number) {
  if (group.animationLerp !== 1) {
    group.setAnimationLerp(
      group.animationLerp + deltaTime * (1 / animationTime)
    );
    if (group.animationLerp > 1) {
      group.setAnimationLerp(1);
    }
  }
}

let lastSnapshotTime = 0;
function update(
  time: number,
  deltaTime: number,
  workspaceStore: Instance<typeof WorkspaceStore>
) {
  if (time - lastSnapshotTime > 5) {
    lastSnapshotTime = time;
    saveSnapshot(workspaceStore);
  }

  workspaceStore.workspaces.forEach((workspace) => {
    workspace.items.forEach((item) => {
      animateItem(item, deltaTime);
      if (item.groupId === 'hidden') {
        if (!item.beingDragged) {
          workspace.changeGroup(
            item,
            workspace.hiddenGroup,
            workspace.inboxGroup
          );
        }
      }
    });
    workspace.groups.forEach((group) => {
      animateGroup(group, deltaTime);
    });
    animateGroup(workspace.hiddenGroup, deltaTime);
    animateGroup(workspace.inboxGroup, deltaTime);
  });
}

function createWorkspaceStore(): Instance<typeof WorkspaceStore> {
  const workspaceStore = WorkspaceStore.create({
    workspaces: {},
  });

  workspaceStore.createWorkspace('default');

  ipcRenderer.send('request-snapshot-path');

  ipcRenderer.on('set-snapshot-path', (_, snapshotPath) => {
    workspaceStore.setSnapshotPath(snapshotPath);
    loadSnapshot(workspaceStore);
  });

  ipcRenderer.on('save-snapshot', () => {
    saveSnapshot(workspaceStore);
  });

  let lastTime = 0;
  let startTime = -1;
  const animationLoop = (milliseconds: number) => {
    const currentTime = milliseconds / 1000;
    if (startTime < 0) {
      startTime = currentTime;
    }
    const time = currentTime - startTime;
    const deltaTime = time - lastTime;
    lastTime = time;

    update(time, deltaTime, workspaceStore);

    requestAnimationFrame(animationLoop);
  };
  requestAnimationFrame(animationLoop);

  return workspaceStore;
}

export default createWorkspaceStore;
