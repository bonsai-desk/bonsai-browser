import { Instance } from 'mobx-state-tree';
import BezierEasing from 'bezier-easing';
import {
  Item as MobxItem,
  itemHeight,
  itemWidth,
} from '../../store/workspace/item';
import { ItemGroup } from '../../store/workspace/item-group';
import { InboxColumnWidth, Workspace } from '../../store/workspace/workspace';

export function overTrash(
  testPos: number[],
  workspace: Instance<typeof Workspace>
): boolean {
  return (
    testPos[0] >= workspace.width / 2 - 50 &&
    testPos[0] <= workspace.width / 2 + 50 &&
    testPos[1] >= 10 &&
    testPos[1] <= 110
  );
}

export function getGroupBelowItem(
  item: Instance<typeof MobxItem>,
  currentGroup: Instance<typeof ItemGroup>,
  containerPos: number[],
  mousePos: number[],
  workspaceStore: Instance<typeof Workspace>
): Instance<typeof ItemGroup> | null {
  let testPos;
  let overGroup;
  if (mousePos[0] < InboxColumnWidth) {
    testPos = mousePos;
    overGroup = workspaceStore.inboxGroup;
  } else {
    testPos = [
      containerPos[0] + (itemWidth / 2) * workspaceStore.scale,
      containerPos[1] + (itemHeight / 2) * workspaceStore.scale,
    ];
    overGroup = workspaceStore.getGroupAtPoint(testPos);
  }

  let swappedFromInbox = false;
  if (overGroup === null) {
    if (currentGroup.id !== 'hidden') {
      workspaceStore.changeGroup(
        item,
        currentGroup,
        workspaceStore.hiddenGroup
      );
      swappedFromInbox = currentGroup.id === 'inbox';
    }
  } else {
    if (overGroup.id !== currentGroup.id) {
      workspaceStore.changeGroup(item, currentGroup, overGroup);
      swappedFromInbox = currentGroup.id === 'inbox';
      workspaceStore.moveToFront(overGroup);
    }
    workspaceStore.arrangeInGroup(item, testPos, overGroup);
  }

  if (swappedFromInbox) {
    const worldPos = workspaceStore.screenToWorld(
      mousePos[0] - (itemWidth / 2) * workspaceStore.scale,
      mousePos[1] - (itemHeight / 2) * workspaceStore.scale
    );
    item.setContainerDragPos([worldPos[0], worldPos[1]]);
  }

  return overGroup;
}

export const easeOut = BezierEasing(0, 0, 0.5, 1);
