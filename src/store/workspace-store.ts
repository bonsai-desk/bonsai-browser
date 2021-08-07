import { types } from 'mobx-state-tree';
import { v4 as uuidv4 } from 'uuid';

export const Item = types
  .model({
    id: types.identifier,
    url: '',
    x: 0,
    y: 0,
  })
  .actions((self) => ({
    reset() {
      self.x = 0;
      self.y = 0;
    },
    move(x: number, y: number) {
      self.x += x;
      self.y += y;
    },
  }));

export const ItemGroup = types
  .model({
    id: types.identifier,
    title: '',
    items: types.array(Item),
    x: 0,
    y: 0,
    zIndex: 0,
  })
  .actions((self) => ({
    addItem(url: string) {
      const item = Item.create({ id: uuidv4(), url });
      self.items.push(item);
      return item;
    },
    move(x: number, y: number) {
      self.x += x;
      self.y += y;
    },
  }));

export const WorkspaceStore = types
  .model({
    groups: types.array(ItemGroup),
  })
  .actions((self) => ({
    addGroup(title: string) {
      const group = ItemGroup.create({ id: uuidv4(), title, items: [] });
      self.groups.push(group);
      return group;
    },
    moveToFront(groupId: string) {
      if (self.groups.length === 0) {
        return;
      }
      let index = -1;
      let maxIndex = 0;
      for (let i = 0; i < self.groups.length; i += 1) {
        if (self.groups[i].zIndex > self.groups[maxIndex].zIndex) {
          maxIndex = i;
        }
        if (self.groups[i].id === groupId) {
          index = i;
        }
      }
      if (index !== -1 && index !== maxIndex) {
        self.groups[index].zIndex = self.groups[maxIndex].zIndex + 1;
      }
    },
  }));

const workspaceStore = WorkspaceStore.create({
  groups: [],
});

workspaceStore.addGroup('my group').addItem('google');

const g = workspaceStore.addGroup('my group 2');
g.addItem('twitch');
g.addItem('youtube');

export default workspaceStore;
