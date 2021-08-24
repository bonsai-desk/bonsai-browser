/* eslint no-console: off */
/* eslint prefer-destructuring: off */

import { types } from 'mobx-state-tree';

export const itemWidth = 200;
export const itemHeight = 125;

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
    setAnimationLerp(animationLerp: number) {
      self.animationLerp = animationLerp;
    },
  }));
