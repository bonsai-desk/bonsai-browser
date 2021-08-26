/* eslint no-console: off */
/* eslint prefer-destructuring: off */

import { types } from 'mobx-state-tree';
import { itemHeight, itemWidth } from './item';

export const groupBorder = 2;
export const groupTitleHeight = 48;
export const groupPadding = 10;
export const itemSpacing = 10;

function widthIntToPixels(width: number): number {
  return itemWidth * width + (width - 1) * itemSpacing + groupPadding * 2;
}

export function widthPixelsToInt(pixels: number): number {
  return (itemSpacing - 2 * groupPadding + pixels) / (itemWidth + itemSpacing);
}

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
    resizing: false,
    tempResizeWidth: 0,
    hovering: false,
    beingDragged: false,
    overTrash: false,
    dragMouseStartX: 0,
    dragMouseStartY: 0,
    shouldEditTitle: false,
  }))
  .views((self) => ({
    size(): [number, number] {
      let width = widthIntToPixels(self.width);
      if (self.resizing && self.tempResizeWidth !== 0) {
        width = widthIntToPixels(self.tempResizeWidth);
      }
      const height = Math.max(
        this.height() * itemHeight +
          groupTitleHeight +
          groupPadding * 2 +
          (this.height() - 1) * itemSpacing,
        groupTitleHeight + 60
      );
      return [width, height];
    },
    height(): number {
      return Math.ceil(self.itemArrangement.length / self.width);
    },
  }))
  .actions((self) => ({
    setHovering(hovering: boolean) {
      self.hovering = hovering;
    },
    setResizing(resizing: boolean) {
      self.resizing = resizing;
    },
    setTempResizeWidth(width: number) {
      if (width < 1) {
        self.tempResizeWidth = 1;
        return;
      }
      self.tempResizeWidth = width;
    },
    setBeingDragged(beingDragged: boolean) {
      self.beingDragged = beingDragged;
    },
    setOverTrash(overTrash: boolean) {
      self.overTrash = overTrash;
    },
    setDragMouseStart(x: number, y: number) {
      self.dragMouseStartX = x;
      self.dragMouseStartY = y;
    },
    move(x: number, y: number) {
      self.x += x;
      self.y += y;
      // console.log([self.x, self.y]);
    },
    setPos(x: number, y: number) {
      self.x = x;
      self.y = y;
    },
    setAnimationLerp(animationLerp: number) {
      self.animationLerp = animationLerp;
    },
    setTitle(title: string) {
      self.title = title;
    },
    setShouldEditTitle(shouldEditTitle: boolean) {
      self.shouldEditTitle = shouldEditTitle;
    },
  }));
