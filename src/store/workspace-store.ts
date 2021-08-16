/* eslint no-console: off */
/* eslint prefer-destructuring: off */

import { destroy, getSnapshot, Instance, types } from 'mobx-state-tree';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { ipcRenderer } from 'electron';
import { clamp } from '../utils/utils';

export const itemWidth = 175;
export const itemHeight = 110;
export const groupTitleHeight = 40;
export const groupPadding = 10;
export const itemSpacing = 10;
const animationTime = 0.15;

export const Item = types
  .model({
    id: types.identifier,
    url: '',
    title: '',
    image: '',
    favicon: '',
    indexInGroup: -1,
    groupId: '',
  })
  .volatile(() => ({
    containerDragPosX: 0,
    containerDragPosY: 0,
    beingDragged: false,
    overTrash: false,
    dragStartGroup: '',
    animationLerp: 1,
    animationStartX: 0,
    animationStartY: 0,
    dragMouseStartX: 0,
    dragMouseStartY: 0,
  }))
  .views((self) => ({
    placeholderPos(group: Instance<typeof ItemGroup>): [number, number] {
      const x = self.indexInGroup % group.width;
      const y = Math.floor(self.indexInGroup / group.width);
      return [
        x * (itemWidth + itemSpacing) + groupPadding + group.x,
        y * (itemHeight + itemSpacing) +
          groupTitleHeight +
          groupPadding +
          group.y,
      ];
    },
  }))
  .actions((self) => ({
    setContainerDragPos(dragPos: number[]) {
      self.containerDragPosX = dragPos[0];
      self.containerDragPosY = dragPos[1];
    },
    setBeingDragged(beingDragged: boolean) {
      self.beingDragged = beingDragged;
    },
    setOverTrash(overTrash: boolean) {
      self.overTrash = overTrash;
    },
    setDragStartGroup(dragStartGroup: string) {
      self.dragStartGroup = dragStartGroup;
    },
    setDragMouseStart(x: number, y: number) {
      self.dragMouseStartX = x;
      self.dragMouseStartY = y;
    },
    recordCurrentTargetAsAnimationStart(group: Instance<typeof ItemGroup>) {
      const currentPos = self.placeholderPos(group);
      self.animationStartX = currentPos[0];
      self.animationStartY = currentPos[1];
    },
    setIndexInGroup(indexInGroup: number, group: Instance<typeof ItemGroup>) {
      if (self.indexInGroup === indexInGroup) {
        return;
      }

      this.recordCurrentTargetAsAnimationStart(group);

      if (!self.beingDragged) {
        self.animationLerp = 0;
      }

      self.indexInGroup = indexInGroup;
    },
    setAnimationLerp(animationLerp: number) {
      self.animationLerp = animationLerp;
    },
  }));

export const ItemGroup = types
  .model({
    id: types.identifier,
    title: '',
    itemArrangement: types.array(types.string),
    x: 0,
    y: 0,
    zIndex: 0,
    width: 1,
  })
  .volatile(() => ({
    animationLerp: 1,
    animationStartWidth: 0,
    animationStartHeight: 0,
  }))
  .views((self) => ({
    size(): [number, number] {
      return [
        itemWidth * self.width +
          (self.width - 1) * itemSpacing +
          groupPadding * 2,
        Math.max(
          this.height() * itemHeight +
            groupTitleHeight +
            groupPadding * 2 +
            (this.height() - 1) * itemSpacing,
          groupTitleHeight + 60
        ),
      ];
    },
    height(): number {
      return Math.ceil(self.itemArrangement.length / self.width);
    },
  }))
  .actions((self) => ({
    move(x: number, y: number) {
      self.x += x;
      self.y += y;
    },
    setAnimationLerp(animationLerp: number) {
      self.animationLerp = animationLerp;
    },
  }));

export const WorkspaceStore = types
  .model({
    hiddenGroup: ItemGroup,
    groups: types.map(ItemGroup),
    items: types.map(Item),
  })
  .volatile(() => ({
    width: 0,
    height: 0,
    anyDragging: false,
    anyOverTrash: false,
    snapshotPath: '',
  }))
  .actions((self) => ({
    setSnapshotPath(snapshotPath: string) {
      self.snapshotPath = snapshotPath;
    },
    setSize(width: number, height: number) {
      self.width = width;
      self.height = height;
    },
    setAnyDragging(anyDragging: boolean) {
      self.anyDragging = anyDragging;
    },
    setAnyOverTrash(anyOverTrash: boolean) {
      self.anyOverTrash = anyOverTrash;
    },
    createGroup(title: string) {
      let maxGroupZ = -1;
      if (self.groups.size !== 0) {
        const groupsArray = Array.from(self.groups.values());
        maxGroupZ = groupsArray[0].zIndex;
        for (let i = 1; i < groupsArray.length; i += 1) {
          if (groupsArray[i].zIndex > maxGroupZ) {
            maxGroupZ = groupsArray[i].zIndex;
          }
        }
      }
      const group = ItemGroup.create({
        id: uuidv4(),
        title,
        itemArrangement: [],
        zIndex: maxGroupZ + 1,
      });
      self.groups.put(group);
      return group;
    },
    createItem(
      url: string,
      title: string,
      image: string,
      favicon: string,
      group: Instance<typeof ItemGroup>
    ) {
      const item = Item.create({ id: uuidv4(), url, title, image, favicon });
      self.items.put(item);
      item.setIndexInGroup(group.itemArrangement.length, group);
      item.groupId = group.id;
      group.itemArrangement.push(item.id);
    },
    deleteItem(item: Instance<typeof Item>, group: Instance<typeof ItemGroup>) {
      group.itemArrangement.splice(item.indexInGroup, 1);
      this.updateItemIndexes(group);

      destroy(item);
    },
    updateItemIndexes(group: Instance<typeof ItemGroup>) {
      for (let i = 0; i < group.itemArrangement.length; i += 1) {
        const nextItem = self.items.get(group.itemArrangement[i]);
        if (typeof nextItem !== 'undefined') {
          nextItem.setIndexInGroup(i, group);
        }
      }
    },
    changeGroup(
      item: Instance<typeof Item>,
      oldGroup: Instance<typeof ItemGroup>,
      newGroup: Instance<typeof ItemGroup>
    ) {
      oldGroup.setAnimationLerp(0);
      const oldGroupSize = oldGroup.size();
      oldGroup.animationStartWidth = oldGroupSize[0];
      oldGroup.animationStartHeight = oldGroupSize[1];

      newGroup.setAnimationLerp(0);
      const newGroupSize = newGroup.size();
      newGroup.animationStartWidth = newGroupSize[0];
      newGroup.animationStartHeight = newGroupSize[1];

      oldGroup.itemArrangement.splice(item.indexInGroup, 1);
      this.updateItemIndexes(oldGroup);

      item.setIndexInGroup(newGroup.itemArrangement.length, newGroup);
      item.groupId = newGroup.id;
      newGroup.itemArrangement.push(item.id);
    },
    setGroupWidth(width: number, group: Instance<typeof ItemGroup>) {
      if (group.width === width) {
        return;
      }

      group.itemArrangement.forEach((itemId) => {
        const item = self.items.get(itemId);
        if (typeof item !== 'undefined') {
          item.recordCurrentTargetAsAnimationStart(group);
          item.setAnimationLerp(0);
        }
      });

      group.setAnimationLerp(0);
      const size = group.size();
      group.animationStartWidth = size[0];
      group.animationStartHeight = size[1];

      group.width = width;
    },
    moveToFront(group: Instance<typeof ItemGroup>) {
      if (self.groups.size === 0) {
        return;
      }
      const groupsArray = Array.from(self.groups.values());
      let maxGroup = groupsArray[0];
      let multipleSameLevel = false;
      for (let i = 1; i < groupsArray.length; i += 1) {
        if (groupsArray[i].zIndex >= maxGroup.zIndex) {
          multipleSameLevel = groupsArray[i].zIndex === maxGroup.zIndex;
          maxGroup = groupsArray[i];
        }
      }

      if (
        typeof group !== 'undefined' &&
        (maxGroup.id !== group.id || multipleSameLevel)
      ) {
        group.zIndex = maxGroup.zIndex + 1;
      }
    },
    inGroup(pos: number[], group: Instance<typeof ItemGroup>): boolean {
      const groupSize = group.size();
      return (
        pos[0] >= group.x &&
        pos[0] <= group.x + groupSize[0] &&
        pos[1] >= group.y &&
        pos[1] <= group.y + groupSize[1]
      );
    },
    getGroupAtPoint(pos: number[]): Instance<typeof ItemGroup> | null {
      let returnGroup: Instance<typeof ItemGroup> | null = null;
      self.groups.forEach((group) => {
        if (this.inGroup(pos, group)) {
          if (returnGroup === null || group.zIndex > returnGroup.zIndex) {
            returnGroup = group;
          }
        }
      });
      return returnGroup;
    },
    arrangeInGroup(
      item: Instance<typeof Item>,
      pos: number[],
      group: Instance<typeof ItemGroup>
    ) {
      if (!this.inGroup(pos, group)) {
        return;
      }

      const relativePos = [pos[0] - group.x, pos[1] - group.y];
      const x = clamp(
        Math.floor((relativePos[0] - groupPadding) / itemWidth),
        0,
        group.width - 1
      );
      const y = clamp(
        Math.floor(
          (relativePos[1] - (groupPadding + groupTitleHeight)) / itemHeight
        ),
        0,
        group.height() - 1
      );
      const newIndex = y * group.width + x;
      if (newIndex === item.indexInGroup) {
        return;
      }

      group.itemArrangement.splice(item.indexInGroup, 1);
      group.itemArrangement.splice(newIndex, 0, item.id);
      this.updateItemIndexes(group);
    },
    deleteGroup(groupId: string) {
      self.groups.delete(groupId);
    },
    print() {
      console.log('---------------------------');
      self.groups.forEach((group) => {
        console.log(`---${group.title} ${group.zIndex}---`);
        group.itemArrangement.forEach((itemId) => {
          const item = self.items.get(itemId);
          if (typeof item === 'undefined') {
            throw new Error('item is undefined');
          }
          console.log(item.url);
        });
      });
    },
  }));

const workspaceStore = WorkspaceStore.create({
  hiddenGroup: ItemGroup.create({
    id: 'hidden',
    title: 'hidden',
    itemArrangement: [],
    zIndex: 0,
  }),
  groups: {},
  items: {},
});

console.log('reeee');

ipcRenderer.send('request-snapshot-path');
ipcRenderer.on('set-snapshot-path', (_, snapshotPath) => {
  workspaceStore.setSnapshotPath(snapshotPath);
  console.log(snapshotPath);
});

let lastSnapshotTime = 0;

let lastTime = 0;
let startTime = -1;
function loop(milliseconds: number) {
  const currentTime = milliseconds / 1000;
  if (startTime === -1) {
    startTime = currentTime;
  }
  const time = currentTime - startTime;
  const deltaTime = time - lastTime;
  lastTime = time;

  if (time - lastSnapshotTime > 5) {
    lastSnapshotTime = time;
    if (workspaceStore.snapshotPath !== '') {
      const snapshot = getSnapshot(workspaceStore);
      const snapshotString = JSON.stringify(snapshot);
      fs.writeFileSync(workspaceStore.snapshotPath, snapshotString);
    }
  }

  workspaceStore.items.forEach((item) => {
    if (item.animationLerp !== 1) {
      item.setAnimationLerp(
        item.animationLerp + deltaTime * (1 / animationTime)
      );
      if (item.animationLerp > 1) {
        item.setAnimationLerp(1);
      }
    }
  });
  workspaceStore.groups.forEach((group) => {
    if (group.animationLerp !== 1) {
      group.setAnimationLerp(
        group.animationLerp + deltaTime * (1 / animationTime)
      );
      if (group.animationLerp > 1) {
        group.setAnimationLerp(1);
      }
    }
  });
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// const group = workspaceStore.createGroup('media');
// const sites = ['youtube', 'twitch', 'netflix', 'disney+', 'hulu'];
// sites.forEach((site) => {
//   workspaceStore.createItem(site, '', '', '', group);
// });
// const group2 = workspaceStore.createGroup('test');
// for (let i = 1; i <= 20; i += 1) {
//   workspaceStore.createItem(i.toString(), group2);
// }

export default workspaceStore;
