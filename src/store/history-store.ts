import { getSnapshot, IAnyModelType, Instance, types } from 'mobx-state-tree';
import { ipcRenderer } from 'electron';
import { v4 as uuidv4 } from 'uuid';

const DEBUG = true;

function log(str: string) {
  if (DEBUG) {
    console.log(str);
  }
}

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
      log(`${webViewId} set head ${node.data.url}`);
      self.heads.set(webViewId, node);
    },
    removeHead(webViewId: string) {
      self.heads.delete(webViewId);
    },
    linkChild(parent: INode, child: INode) {
      log(`link (${parent.data.url}) to (${child.data.url})`);
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
      log(`swap active webView from (${self.active}) to (${webViewId})`);
      self.active = webViewId;
    },
  }));

export type IHistory = Instance<typeof HistoryStore>;

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

function headKeyWhereNode(
  history: IHistory,
  destinationNode: INode
): number | undefined {
  const match: number[] = [];
  history.heads.forEach((node, key) => {
    if (node.id === destinationNode.id) {
      match.push(parseInt(key, 10));
    }
  });
  if (match.length > 0) {
    return match[0];
  }
  return undefined;
}

function setTab(webViewId: number) {
  // log(`swap active head from ${history.active} to ${webViewId}`);
  ipcRenderer.send('set-tab', webViewId);
}

export function goBack(history: IHistory, node: INode) {
  log('=== go back ===');
  const key = headKeyWhereNode(history, node);
  if (key) {
    setTab(key);
  } else {
    log('dispatch go back to main');
    ipcRenderer.send('go-back', {
      senderId: history.active,
      backTo: getSnapshot(node),
    });
  }
}

export function goForward(history: IHistory, destinationNode: INode) {
  log('=== go forward ===');
  const key = headKeyWhereNode(history, destinationNode);
  if (key) {
    setTab(key);
  } else {
    log(`${history.active} dispatch go forward to ${destinationNode.id}`);
    ipcRenderer.send('go-forward', {
      senderId: history.active,
      forwardTo: getSnapshot(destinationNode),
    });
  }
}

function parentIsUrl(oldNode: INode | undefined, url: string) {
  return oldNode && oldNode.parent && oldNode.parent.data.url === url;
}

export function hookListeners(root: Instance<typeof HistoryStore>) {
  ipcRenderer.on('new-window', (_, data) => {
    const { senderId, receiverId, details } = data;
    const receiverNode = genNode(details.url);
    log('=== new window ===');
    log(`${senderId} spawn ${receiverId}`);
    root.setNode(receiverNode);
    const senderNode = root.heads.get(senderId);
    if (senderNode) {
      root.linkChild(senderNode, receiverNode);
    }
    root.setHead(receiverId, receiverNode);
  });
  ipcRenderer.on('did-navigate', (_, { id, url }) => {
    log(`${id} did navigate ${url}`);
    const rootNode = root.heads.get(id);
    if (!rootNode) {
      log(`${id} did create root for ${url}`);
      const node = genNode(url);
      root.setNode(node);
      root.setHead(id, node);
    }
  });
  ipcRenderer.on('tab-was-set', (_, id) => {
    root.setActive(id.toString());
  });
  ipcRenderer.on('will-navigate', (_, { id, url }) => {
    log('=== will-navigate ===');
    log(`${id} will navigate ${url}`);
    const oldNode = root.heads.get(id);
    if (!(oldNode && oldNode.data.url === url)) {
      if (parentIsUrl(oldNode, url)) {
        log('nav to parent');
        root.setHead(id, oldNode?.parent);
      } else {
        log(`${id} did create node for ${url}`);
        const node = genNode(url);
        root.setNode(node);
        if (oldNode) {
          root.linkChild(oldNode, node);
        }
        root.setHead(id, node);
      }
    }
  });
  ipcRenderer.on('go-back', (_, { id }) => {
    log(`${id} did go back`);
    const oldNode = root.heads.get(id);
    if (oldNode && oldNode.parent) {
      root.setHead(id, oldNode.parent);
    }
  });
  ipcRenderer.on('go-forward', (_, { id, url }) => {
    log(`${id} did go forward to ${url}`);
    const oldNode = root.heads.get(id);
    if (oldNode) {
      const forwards = oldNode.children.filter(
        (child) => child.data.url === url
      );
      if (forwards.length > 0) {
        root.setHead(id, forwards[0]);
      }
    }
  });
}
