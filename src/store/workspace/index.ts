/* eslint no-console: off */
/* eslint prefer-destructuring: off */

import { applySnapshot, getSnapshot, Instance } from 'mobx-state-tree';
import { ipcRenderer } from 'electron';
import fs from 'fs';
import { Item } from './item';
import { ItemGroup } from './item-group';
import { Workspace } from './workspace';

function createWorkspaceStore() {
  const animationTime = 0.15;
  const workspaceStore = Workspace.create({
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

  function saveSnapshot() {
    if (workspaceStore.snapshotPath !== '') {
      const snapshot = getSnapshot(workspaceStore);
      const snapshotString = JSON.stringify(snapshot);
      fs.writeFileSync(workspaceStore.snapshotPath, snapshotString);
    }
  }

  function loadSnapshot() {
    if (workspaceStore.snapshotPath !== '') {
      try {
        const workspaceJson = fs.readFileSync(
          workspaceStore.snapshotPath,
          'utf8'
        );
        if (workspaceJson !== '') {
          const workspaceSnapshot = JSON.parse(workspaceJson);
          applySnapshot(workspaceStore, workspaceSnapshot);
        }
      } catch {
        //
      }
    }
  }

  ipcRenderer.send('request-snapshot-path');

  ipcRenderer.on('set-snapshot-path', (_, snapshotPath) => {
    workspaceStore.setSnapshotPath(snapshotPath);
    loadSnapshot();
  });

  ipcRenderer.on('save-snapshot', () => {
    saveSnapshot();
  });

  let lastSnapshotTime = 0;

  let lastTime = 0;
  let startTime = -1;
  const loop = (milliseconds: number) => {
    const currentTime = milliseconds / 1000;
    if (startTime < 0) {
      startTime = currentTime;
    }
    const time = currentTime - startTime;
    const deltaTime = time - lastTime;
    lastTime = time;

    if (time - lastSnapshotTime > 5) {
      lastSnapshotTime = time;
      saveSnapshot();
    }

    function animateItem(item: Instance<typeof Item>) {
      if (item.animationLerp !== 1) {
        item.setAnimationLerp(
          item.animationLerp + deltaTime * (1 / animationTime)
        );
        if (item.animationLerp > 1) {
          item.setAnimationLerp(1);
        }
      }
    }
    workspaceStore.items.forEach((item) => {
      animateItem(item);
      if (item.groupId === 'hidden') {
        if (!item.beingDragged) {
          workspaceStore.changeGroup(
            item,
            workspaceStore.hiddenGroup,
            workspaceStore.inboxGroup
          );
        }
      }
    });
    function animateGroup(group: Instance<typeof ItemGroup>) {
      if (group.animationLerp !== 1) {
        group.setAnimationLerp(
          group.animationLerp + deltaTime * (1 / animationTime)
        );
        if (group.animationLerp > 1) {
          group.setAnimationLerp(1);
        }
      }
    }
    workspaceStore.groups.forEach((group) => {
      animateGroup(group);
    });
    animateGroup(workspaceStore.hiddenGroup);
    animateGroup(workspaceStore.inboxGroup);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  return workspaceStore;
}

export default createWorkspaceStore;
