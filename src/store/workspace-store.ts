/* eslint no-console: off */
/* eslint prefer-destructuring: off */

import { Instance, types } from 'mobx-state-tree';
import { v4 as uuidv4 } from 'uuid';
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
    indexInGroup: -1,
    groupId: '',
  })
  .volatile(() => ({
    containerDragPosX: 0,
    containerDragPosY: 0,
    beingDragged: false,
    dragStartGroup: '',
    animationLerp: 1,
    animationStartX: 0,
    animationStartY: 0,
  }))
  .views((self) => ({
    placeholderRelativePos(): [number, number] {
      return [
        groupPadding,
        self.indexInGroup * (itemHeight + itemSpacing) +
          groupTitleHeight +
          groupPadding,
      ];
    },
    placeholderPos(groupX: number, groupY: number): [number, number] {
      const relPos = this.placeholderRelativePos();
      relPos[0] += groupX;
      relPos[1] += groupY;
      return relPos;
    },
    placeholderCenterPos(groupX: number, groupY: number): [number, number] {
      const pos = this.placeholderPos(groupX, groupY);
      pos[0] += itemWidth / 2;
      pos[1] += itemHeight / 2;
      return pos;
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
    setDragStartGroup(dragStartGroup: string) {
      self.dragStartGroup = dragStartGroup;
    },
    setIndexInGroup(indexInGroup: number, group: Instance<typeof ItemGroup>) {
      if (self.indexInGroup === indexInGroup) {
        return;
      }

      const currentPos = self.placeholderPos(group.x, group.y);
      self.animationStartX = currentPos[0];
      self.animationStartY = currentPos[1];

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
  })
  .actions((self) => ({
    move(x: number, y: number) {
      self.x += x;
      self.y += y;
    },
  }))
  .views((self) => ({
    size(): [number, number] {
      return [
        itemWidth + groupPadding * 2,
        Math.max(
          self.itemArrangement.length * itemHeight +
            groupTitleHeight +
            groupPadding * 2 +
            (self.itemArrangement.length - 1) * itemSpacing,
          100
        ),
      ];
    },
  }));

export const WorkspaceStore = types
  .model({
    hiddenGroup: ItemGroup,
    groups: types.map(ItemGroup),
    items: types.map(Item),
  })
  .actions((self) => ({
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
    createItem(url: string, group: Instance<typeof ItemGroup>) {
      const item = Item.create({ id: uuidv4(), url });
      self.items.put(item);
      item.setIndexInGroup(group.itemArrangement.length, group);
      item.groupId = group.id;
      group.itemArrangement.push(item.id);
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
      oldGroup.itemArrangement.splice(item.indexInGroup, 1);
      this.updateItemIndexes(oldGroup);

      item.setIndexInGroup(newGroup.itemArrangement.length, newGroup);
      item.groupId = newGroup.id;
      newGroup.itemArrangement.push(item.id);
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
      const newIndex = clamp(
        Math.floor(
          (relativePos[1] - (groupPadding + groupTitleHeight)) / itemHeight
        ),
        0,
        group.itemArrangement.length - 1
      );

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
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

const group = workspaceStore.createGroup('media');
const sites = ['youtube', 'twitch', 'netflix', 'disney+', 'hulu'];

sites.forEach((site) => {
  workspaceStore.createItem(site, group);
});

export default workspaceStore;
