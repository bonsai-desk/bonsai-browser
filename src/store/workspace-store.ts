import { Instance, types, detach } from 'mobx-state-tree';
import { v4 as uuidv4 } from 'uuid';

export const itemSize = 110;
const groupTitleHeight = 25;
const groupPadding = 10;
const itemSpacing = 10;

export const Item = types
  .model({
    id: types.identifier,
    url: '',
    indexInGroup: -1,
  })
  .views((self) => ({
    placeHolderRelativePos(): [number, number] {
      return [
        groupPadding,
        self.indexInGroup * (itemSize + itemSpacing) +
          groupTitleHeight +
          groupPadding,
      ];
    },
    placeHolderCenterPos(groupX: number, groupY: number): [number, number] {
      const relPos = this.placeHolderRelativePos();
      relPos[0] += groupX + itemSize / 2;
      relPos[1] += groupY + itemSize / 2;
      return relPos;
    },
  }));

export const ItemGroup = types
  .model({
    id: types.identifier,
    title: '',
    items: types.map(Item),
    itemArrangement: types.array(types.string),
    x: 0,
    y: 0,
    zIndex: 0,
  })
  .actions((self) => ({
    createItem(url: string) {
      const item = Item.create({ id: uuidv4(), url });
      this.addItem(item);
    },
    addItem(item: Instance<typeof Item>) {
      self.items.put(item);
      item.indexInGroup = self.itemArrangement.length;
      self.itemArrangement.push(item.id);
    },
    removeItem(id: string): Instance<typeof Item> | null {
      const item = self.items.get(id);
      if (typeof item === 'undefined') {
        return null;
      }

      self.itemArrangement.splice(item.indexInGroup, 1);
      for (let i = 0; i < self.itemArrangement.length; i += 1) {
        const nextItem = self.items.get(self.itemArrangement[i]);
        if (typeof nextItem !== 'undefined') {
          nextItem.indexInGroup = i;
        }
      }

      item.indexInGroup = -1;
      detach(item);
      return item;
    },
    move(x: number, y: number) {
      self.x += x;
      self.y += y;
    },
  }))
  .views((self) => ({
    size(): [number, number] {
      return [
        itemSize + groupPadding * 2,
        Math.max(
          self.itemArrangement.length * itemSize +
            groupTitleHeight +
            groupPadding * 2 +
            (self.items.size - 1) * itemSpacing,
          100
        ),
      ];
    },
  }));

export const WorkspaceStore = types
  .model({
    groups: types.map(ItemGroup),
  })
  .actions((self) => ({
    addGroup(title: string) {
      const group = ItemGroup.create({
        id: uuidv4(),
        title,
        items: {},
        itemArrangement: [],
      });
      self.groups.put(group);
      return group;
    },
    moveToFront(groupId: string) {
      if (self.groups.size === 0) {
        return;
      }
      const maxGroup = Array.from(self.groups.values()).reduce(
        (a: Instance<typeof ItemGroup>, c: Instance<typeof ItemGroup>) => {
          return c.zIndex > a.zIndex ? c : a;
        }
      );
      const group = self.groups.get(groupId);
      if (typeof group !== 'undefined' && maxGroup.id !== groupId) {
        group.zIndex = maxGroup.zIndex + 1;
      }
    },
    getGroupAtPoint(pos: [number, number]): Instance<typeof ItemGroup> | null {
      let returnGroup: Instance<typeof ItemGroup> | null = null;
      self.groups.forEach((group) => {
        const groupSize = group.size();
        if (
          pos[0] >= group.x &&
          pos[0] <= group.x + groupSize[0] &&
          pos[1] >= group.y &&
          pos[1] <= group.y + groupSize[1]
        ) {
          if (returnGroup === null || group.zIndex > returnGroup.zIndex) {
            returnGroup = group;
          }
        }
      });
      return returnGroup;
    },
    print() {
      console.log('---------------------------');
      self.groups.forEach((group) => {
        console.log(`---${group.title}---`);
        group.items.forEach((item) => {
          console.log(item.url);
        });
      });
    },
  }));

const workspaceStore = WorkspaceStore.create({
  groups: {},
});

workspaceStore.addGroup('my group').createItem('google');

const g = workspaceStore.addGroup('my group 2');
g.createItem('twitch');
g.createItem('youtube');

workspaceStore.addGroup('my group 3');

export default workspaceStore;
