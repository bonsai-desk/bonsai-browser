/* eslint no-console: off */
/* eslint prefer-destructuring: off */

import { destroy, Instance, types } from 'mobx-state-tree';
import { v4 as uuidv4 } from 'uuid';
import { mat4, vec3, vec4 } from 'gl-matrix';
import {
  groupBorder,
  groupPadding,
  groupTitleHeight,
  ItemGroup,
  itemSpacing,
} from './item-group';
import { Item, itemHeight, itemWidth } from './item';
import { clamp } from '../../utils/utils';
import { calculateMatrices, transformPosition } from './utils';

export const InboxColumnWidth = 300;

const minZoom = 0.035;
const maxZoom = 1;
const defaultZoom = 0.25;

export const Workspace = types
  .model({
    id: types.identifier,
    name: '',
    hiddenGroup: ItemGroup,
    inboxGroup: ItemGroup,
    groups: types.map(ItemGroup),
    items: types.map(Item),
    cameraZoom: defaultZoom,
    cameraX: 0,
    cameraY: 0,
  })
  .volatile(() => ({
    x: 0,
    y: 0,
    width: 1,
    height: 1,
    anyDragging: false,
    anyOverTrash: false,
    tempMinCameraZoom: minZoom,
    inboxScrollY: 0,
    hamburgerOpen: false,
    shouldEditName: false,
  }))
  .views((self) => {
    const noAllocPos = vec4.create();
    const noAllocPos3 = vec3.create();
    const WorldToClip = mat4.create();
    const ClipToWorld = mat4.create();
    const ScreenToClip = mat4.create();
    const ClipToScreen = mat4.create();

    return {
      get scale() {
        return (
          (self.height /
            (itemHeight +
              groupTitleHeight +
              groupPadding * 2 +
              groupBorder * 2) /
            (1 / 0.75)) *
          self.cameraZoom
        );
      },
      get inboxScale() {
        return (
          self.width /
          (itemWidth + groupPadding * 2 + groupBorder * 2) /
          (1 / (InboxColumnWidth / self.width))
        );
      },
      get getMatrices() {
        return calculateMatrices(
          self.width,
          self.height,
          self.cameraZoom,
          self.cameraX,
          self.cameraY,
          noAllocPos3,
          WorldToClip,
          ClipToWorld,
          ScreenToClip,
          ClipToScreen
        );
      },
      worldToScreen(x: number, y: number): [number, number] {
        const { worldToClip, clipToScreen } = this.getMatrices;
        return transformPosition(x, y, worldToClip, clipToScreen, noAllocPos);
      },
      screenToWorld(x: number, y: number): [number, number] {
        const { screenToClip, clipToWorld } = this.getMatrices;
        return transformPosition(x, y, screenToClip, clipToWorld, noAllocPos);
      },
      screenVectorToWorldVector(x: number, y: number): [number, number] {
        const world0 = this.screenToWorld(0, 0);
        const worldV = this.screenToWorld(x, y);
        return [worldV[0] - world0[0], worldV[1] - world0[1]];
      },
    };
  })
  .actions((self) => ({
    setShouldEditName(shouldEditName: boolean) {
      self.shouldEditName = shouldEditName;
    },
    setHamburgerOpen(hamburgerOpen: boolean) {
      self.hamburgerOpen = hamburgerOpen;
    },
    setName(name: string) {
      self.name = name;
    },
    repositionInbox() {
      const inboxPos = self.screenToWorld(0, -self.inboxScrollY);
      self.inboxGroup.setPos(inboxPos[0], inboxPos[1]);

      const hiddenPos = self.screenToWorld(0, 0);
      self.hiddenGroup.setPos(hiddenPos[0], hiddenPos[1]);
    },
    setInboxScrollY(inboxScrollY: number) {
      const maxY = Math.max(
        self.inboxGroup.size()[1] * self.inboxScale - self.height,
        0
      );
      self.inboxScrollY = clamp(inboxScrollY, 0, maxY);
      this.repositionInbox();
    },
    moveGroupsToPosition(x: number, y: number) {
      self.groups.forEach((group) => {
        group.setPos(x, y);
      });
    },
    setCameraZoom(zoom: number) {
      self.cameraZoom = clamp(zoom, self.tempMinCameraZoom, maxZoom);
      if (zoom > self.tempMinCameraZoom) {
        self.tempMinCameraZoom = Math.min(zoom, minZoom);
      }
      this.repositionInbox();
      // console.log(`set camera zoom ${self.cameraZoom}`);
    },
    moveCamera(x: number, y: number) {
      self.cameraX += x;
      self.cameraY += y;
      this.repositionInbox();
    },
    setCameraPosition(x: number, y: number) {
      self.cameraX = x;
      self.cameraY = y;
      this.repositionInbox();
    },
    centerCameraOnItem(itemId: string) {
      const item = self.items.get(itemId);
      if (typeof item === 'undefined') {
        return;
      }
      if (item.groupId === 'hidden' || item.groupId === 'inbox') {
        return;
      }

      const group = self.groups.get(item.groupId);
      if (typeof group === 'undefined') {
        return;
      }

      this.setCameraZoom(maxZoom / 3);

      const screenPos = this.placeholderPos(item, group);
      const offset = self.screenVectorToWorldVector(
        screenPos[0] + (itemWidth / 2) * self.scale,
        screenPos[1] + (itemHeight / 2) * self.scale
      );
      this.setCameraPosition(group.x + offset[0], group.y + offset[1]);
    },
    centerCamera() {
      self.tempMinCameraZoom = minZoom;
      self.cameraZoom = defaultZoom;
      let edges = [0, 0, 0, 0];
      let first = true;
      self.groups.forEach((group) => {
        const screenPos = self.worldToScreen(group.x, group.y);
        const size = group.size();
        const scale = self.scale;
        size[0] *= scale;
        size[1] *= scale;
        const corners = [
          [screenPos[0], screenPos[1]],
          [screenPos[0] + size[0], screenPos[1]],
          [screenPos[0] + size[0], screenPos[1] + size[1]],
          [screenPos[0], screenPos[1] + size[1]],
        ];
        const testPositions = [
          self.screenToWorld(corners[0][0], corners[0][1]),
          self.screenToWorld(corners[1][0], corners[1][1]),
          self.screenToWorld(corners[2][0], corners[2][1]),
          self.screenToWorld(corners[3][0], corners[3][1]),
        ];
        if (first) {
          first = false;
          edges = [
            testPositions[0][1],
            testPositions[1][0],
            testPositions[2][1],
            testPositions[3][0],
          ];
        } else {
          for (let i = 0; i < 4; i += 1) {
            const testPos = testPositions[i];
            if (testPos[1] > edges[0]) {
              edges[0] = testPos[1];
            }
            if (testPos[0] > edges[1]) {
              edges[1] = testPos[0];
            }
            if (testPos[1] < edges[2]) {
              edges[2] = testPos[1];
            }
            if (testPos[0] < edges[3]) {
              edges[3] = testPos[0];
            }
          }
        }
      });

      const padding = 0.5;
      edges[0] += padding;
      edges[1] += padding;
      edges[2] -= padding;
      edges[3] -= padding;

      const height = edges[0] - edges[2];
      const yZoom = 1 / (height / 2);

      const width = edges[1] - edges[3];
      const aspectRatio = (self.width - InboxColumnWidth) / self.height;
      const xZoom = 1 / (width / (aspectRatio * 2));

      const zoom = Math.min(yZoom, xZoom, defaultZoom);
      self.tempMinCameraZoom = Math.min(zoom, minZoom);

      this.setCameraZoom(zoom);

      this.setCameraPosition(
        (edges[1] + edges[3]) / 2 -
          self.screenVectorToWorldVector(300, 0)[0] / 2,
        (edges[0] + edges[2]) / 2
      );
    },
    setRect(x: number, y: number, width: number, height: number) {
      self.x = x;
      self.y = y;
      self.width = width;
      self.height = height;
      this.repositionInbox();
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
      this.setIndexInGroup(group.itemArrangement.length, item, group);
      item.groupId = group.id;
      group.itemArrangement.push(item.id);

      // move to top
      group.itemArrangement.splice(item.indexInGroup, 1);
      group.itemArrangement.splice(0, 0, item.id);
      this.updateItemIndexes(group);
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
          this.setIndexInGroup(i, nextItem, group);
        }
      }
    },
    changeGroup(
      item: Instance<typeof Item>,
      oldGroup: Instance<typeof ItemGroup>,
      newGroup: Instance<typeof ItemGroup>
    ) {
      if (oldGroup.id === 'inbox' && self.groups.keys().next().done) {
        this.centerCamera();
      }

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

      this.setIndexInGroup(newGroup.itemArrangement.length, item, newGroup);
      item.groupId = newGroup.id;
      newGroup.itemArrangement.push(item.id);

      if (oldGroup.id === 'inbox') {
        const maxY = Math.max(
          self.inboxGroup.size()[1] * self.inboxScale - self.height,
          0
        );
        self.inboxScrollY = clamp(self.inboxScrollY, 0, maxY);
        this.repositionInbox();
      }
    },
    setGroupWidth(
      width: number,
      group: Instance<typeof ItemGroup>,
      forceUpdate = false
    ) {
      if (group.width === width && !forceUpdate) {
        return;
      }

      group.itemArrangement.forEach((itemId) => {
        const item = self.items.get(itemId);
        if (typeof item !== 'undefined') {
          this.recordCurrentTargetAsAnimationStart(item, group);
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

      const [groupScreenX, groupScreenY] = self.worldToScreen(group.x, group.y);

      const scale = group.id === 'inbox' ? self.inboxScale : self.scale;

      return (
        pos[0] >= groupScreenX &&
        pos[0] <= groupScreenX + groupSize[0] * scale &&
        pos[1] >= groupScreenY &&
        pos[1] <= groupScreenY + groupSize[1] * scale
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
      if (group.id !== 'inbox' && !this.inGroup(pos, group)) {
        return;
      }

      const scale = group.id === 'inbox' ? self.inboxScale : self.scale;

      const [groupScreenX, groupScreenY] = self.worldToScreen(group.x, group.y);

      const relativePos = [pos[0] - groupScreenX, pos[1] - groupScreenY];
      const x = clamp(
        Math.floor(
          (relativePos[0] - (groupPadding + groupBorder) * scale) /
            (itemWidth * scale)
        ),
        0,
        group.width - 1
      );
      const y = clamp(
        Math.floor(
          (relativePos[1] -
            (groupPadding + groupTitleHeight + groupBorder) * scale) /
            (itemHeight * scale)
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
    deleteGroup(group: Instance<typeof ItemGroup>) {
      group.itemArrangement.forEach((itemId) => {
        const item = self.items.get(itemId);
        if (typeof item !== 'undefined') {
          if (group.id !== 'hidden') {
            this.changeGroup(item, group, self.hiddenGroup);
          }
          this.deleteItem(item, self.hiddenGroup);
        }
      });

      destroy(group);
    },
    placeholderPos(
      item: Instance<typeof Item>,
      group: Instance<typeof ItemGroup>
    ): [number, number] {
      const scale = group.id === 'inbox' ? self.inboxScale : self.scale;
      const x = item.indexInGroup % group.width;
      const y = Math.floor(item.indexInGroup / group.width);
      return [
        (x * (itemWidth + itemSpacing) + groupPadding + groupBorder) * scale,
        (y * (itemHeight + itemSpacing) +
          groupTitleHeight +
          groupPadding +
          groupBorder) *
          scale,
      ];
    },
    recordCurrentTargetAsAnimationStart(
      item: Instance<typeof Item>,
      group: Instance<typeof ItemGroup>
    ) {
      const currentPos = this.placeholderPos(item, group);
      item.animationStartX = currentPos[0];
      item.animationStartY = currentPos[1];
    },
    setIndexInGroup(
      indexInGroup: number,
      item: Instance<typeof Item>,
      group: Instance<typeof ItemGroup>
    ) {
      if (item.indexInGroup === indexInGroup) {
        return;
      }

      this.recordCurrentTargetAsAnimationStart(item, group);

      if (!item.beingDragged) {
        item.animationLerp = 0;
      }

      item.indexInGroup = indexInGroup;
    },
  }));
