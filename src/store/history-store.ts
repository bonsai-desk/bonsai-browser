import { getSnapshot, IAnyModelType, Instance, types } from 'mobx-state-tree';
import { ipcRenderer } from 'electron';
import { v4 as uuidv4 } from 'uuid';

export const HistoryData = types.model({
  url: types.string,
  scroll: 0,
  date: types.string,
});

export const Node = types
  .model({
    id: types.identifier,
    data: HistoryData, // as an example
    parent: types.maybe(types.reference(types.late((): IAnyModelType => Node))),
    children: types.array(
      types.reference(types.late((): IAnyModelType => Node))
    ),
  })
  .actions((self) => ({
    setParent(a: Instance<typeof self> | null) {
      self.parent = a;
    },
    setData(a: Instance<typeof HistoryData>) {
      self.data = a;
    },
    addChild(a: Instance<typeof self>) {
      self.children.push(a);
    },
    removeChild(a: Instance<typeof self>): boolean {
      return self.children.remove(a);
    },
  }));

export type INode = Instance<typeof Node>;

export const Root = types
  .model({
    nodes: types.map(Node), // Node Id => Node
    heads: types.map(types.reference(Node)), // WebView Id => Node
    refer: types.map(types.reference(Node)), // Url => Node
  })
  .actions((self) => ({
    setNode(node: INode) {
      self.nodes.set(node.id, node);
    },
    setHead(webViewId: string, node: INode) {
      self.heads.set(webViewId, node);
    },
    setRefer(node: INode, url: string) {
      self.refer.set(url, node);
    },
    removeRefer(url: string) {
      self.refer.delete(url);
    },
    removeHead(webViewId: string) {
      self.heads.delete(webViewId);
    },
    linkChild(parent: INode, child: INode) {
      parent.addChild(child);
      child.setParent(parent);
    },
    removeNode(a: INode) {
      a.parent?.removeChild(a);
      a.children.forEach((child: INode) => {
        child.setParent(null);
      });
      self.nodes.delete(a.id);
    },
  }));

export function childLeaves(a: INode) {
  return a.children.filter((x) => x.children.length === 0);
}

export function childParents(a: INode) {
  return a.children.filter((x) => x.children.length > 0);
}

function registerLeavesRecursive(a: INode, register: (arg: INode) => void) {
  childLeaves(a).forEach((child) => register(child));
  childParents(a).forEach((child) => registerLeavesRecursive(child, register));
}

export function allDescendentLeaves(a: INode): INode[] {
  const acc: INode[] = [];
  const register = (aLeaf: INode) => {
    acc.push(aLeaf);
  };
  registerLeavesRecursive(a, register);
  return acc;
}

export function hookListeners(root: Instance<typeof Root>) {
  console.log('hook history to root ', root);
  ipcRenderer.on('new-window', (_, data) => {
    const terminalNode = root.heads.get(data.id);
    if (terminalNode) {
      root.setRefer(terminalNode, data.url);
      console.log('new window ---');
      console.dir(getSnapshot(root));
    }
  });
  ipcRenderer.on('did-navigate', (_, { id, url }) => {
    const date = Date.now() / 1000;
    const data = HistoryData.create({ url, scroll: 0, date: date.toString() });
    const node = Node.create({ id: uuidv4(), data });
    root.setNode(node);
    const oldNode = root.heads.get(id);
    if (oldNode) {
      root.linkChild(oldNode, node);
    } else {
      const parent = root.refer.get(url);
      if (parent) {
        root.linkChild(parent, node);
        root.removeRefer(url);
      }
    }
    root.setHead(id, node);
    console.log('navigate ---');
    console.dir(getSnapshot(root));
  });
}
