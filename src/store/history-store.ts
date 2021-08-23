import { IAnyModelType, Instance, types } from 'mobx-state-tree';
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

export const HistoryStore = types
  .model({
    nodes: types.map(Node), // Node Id => Node
    heads: types.map(types.reference(Node)), // WebView Id => Node
    active: types.string, // WebView Id
  })
  .actions((self) => ({
    setNode(node: INode) {
      self.nodes.set(node.id, node);
    },
    setHead(webViewId: string, node: INode) {
      self.heads.set(webViewId, node);
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
    setActive(webViewId: string) {
      self.active = webViewId;
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

function genNode(url: string) {
  const date = Date.now() / 1000;
  const data = HistoryData.create({ url, scroll: 0, date: date.toString() });
  return Node.create({ id: uuidv4(), data });
}

export function hookListeners(root: Instance<typeof HistoryStore>) {
  ipcRenderer.on('new-window', (_, data) => {
    const { senderId, receiverId, details } = data;
    const receiverNode = genNode(details.url);
    root.setNode(receiverNode);
    const senderNode = root.heads.get(senderId);
    if (senderNode) {
      root.linkChild(senderNode, receiverNode);
    }
    root.setHead(receiverId, receiverNode);
  });
  ipcRenderer.on('did-navigate', (_, { id, url }) => {
    const oldNode = root.heads.get(id);
    if (!(oldNode && oldNode.data.url === url)) {
      const node = genNode(url);
      root.setNode(node);
      if (oldNode) {
        root.linkChild(oldNode, node);
      }
      root.setHead(id, node);
    }
  });
  ipcRenderer.on('tab-was-set', (_, id) => {
    root.setActive(id.toString());
  });
}
