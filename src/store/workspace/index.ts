/* eslint no-console: off */
/* eslint prefer-destructuring: off */

import { applySnapshot, getSnapshot, Instance } from 'mobx-state-tree';
import { ipcRenderer } from 'electron';
import fs from 'fs';
import path from 'path';
import { runInAction } from 'mobx';
import { Item } from './item';
import { ItemGroup } from './item-group';
import WorkspaceStore from './workspace-store';
import { base64ImgToDisk, tryDecrypt } from '../../utils/utils';

const animationTime = 0.15;

function saveSnapshot(workspaceStore: Instance<typeof WorkspaceStore>) {
  if (!workspaceStore.attemptedToLoadSnapshot) {
    return;
  }
  if (workspaceStore.snapshotPath !== '') {
    try {
      const snapshot = getSnapshot(workspaceStore);
      const snapshotString = JSON.stringify(snapshot, null, '  ');
      fs.writeFileSync(workspaceStore.snapshotPath, snapshotString);
    } catch {
      //
    }
  }
}

function JSONTryParse(JSONString: string) {
  try {
    const object = JSON.parse(JSONString);
    return { success: true, object };
  } catch {
    //
  }
  return { success: false, object: {} };
}

function updateStoreFromV1ToV2(
  workspaceStore: Instance<typeof WorkspaceStore>
) {
  workspaceStore.workspaces.forEach((workspace) => {
    workspace.items.forEach((item) => {
      const imgName = base64ImgToDisk(
        item.image,
        path.join(workspaceStore.dataPath, 'images')
      );
      item.setImage(imgName);
    });
  });
  workspaceStore.setVersion(2);
}

function loadSnapshot(workspaceStore: Instance<typeof WorkspaceStore>) {
  if (workspaceStore.snapshotPath !== '') {
    workspaceStore.setAttemptedToLoadSnapshot(true);
    try {
      const exists = fs.existsSync(workspaceStore.snapshotPath);
      if (!exists) {
        return;
      }
      const workspaceJson = fs.readFileSync(
        workspaceStore.snapshotPath,
        'utf8'
      );
      if (workspaceJson !== '') {
        const result1 = JSONTryParse(workspaceJson);
        const result2 = JSONTryParse(tryDecrypt(workspaceJson));
        if (!result1.success && !result2.success) {
          console.log('failed to parse snapshot. renaming file. (1)');
          const dateString = new Date()
            .toString()
            .replace(/[/\\?%*:|"<>]/g, '-');
          fs.renameSync(
            workspaceStore.snapshotPath,
            `${workspaceStore.snapshotPath}(broken) ${dateString}`
          );
          return;
        }
        const workspaceSnapshot = result1.success
          ? result1.object
          : result2.object;

        // if snapshot has no version, it was made before the version system, so we will call that version 1
        // snapshots with the new version system start at 2 and up
        if (typeof workspaceSnapshot.version === 'undefined') {
          runInAction(() => {
            workspaceSnapshot.version = 1;
            // workspaceSnapshot.setVersion(1);
          });
        }

        applySnapshot(workspaceStore, workspaceSnapshot);

        if (workspaceSnapshot.version === 1) {
          ipcRenderer.send('log-data', 'snapshot being updated from V1 to V2');
          updateStoreFromV1ToV2(workspaceStore);
          saveSnapshot(workspaceStore);
        }

        return;
      }
    } catch (e) {
      ipcRenderer.send('log-data', `loadSnapshot error: ${e}`);
    }
    try {
      const exists = fs.existsSync(workspaceStore.snapshotPath);
      if (exists) {
        console.log('failed to parse snapshot. renaming file. (2)');
        const dateString = new Date().toString().replace(/[/\\?%*:|"<>]/g, '-');
        fs.renameSync(
          workspaceStore.snapshotPath,
          `${workspaceStore.snapshotPath}(broken) ${dateString}`
        );
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
    workspace.updateVolatileRenderValues();

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
    version: 2, // this number is the version for new stores. old stores loaded in will override the version and will need to be updated
    workspaces: {},
  });

  workspaceStore.createWorkspace('default');

  ipcRenderer.send('request-data-path');

  ipcRenderer.on('set-data-path', (_, dataPath) => {
    const snapshotPath = path.join(dataPath, 'workspaceSnapshot');
    workspaceStore.setSnapshotPath(snapshotPath);
    workspaceStore.setDataPath(dataPath);
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
