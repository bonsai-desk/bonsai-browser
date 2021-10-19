import { IAnyModelType, Instance, types } from 'mobx-state-tree';
import { ipcRenderer } from 'electron';
import { v4 as uuidv4 } from 'uuid';

const DEBUG = false;

function log(str: string) {
  if (DEBUG) {
    // eslint-disable-next-line no-console
    console.log(str);
  }
}

export const HistoryData = types.model({
  url: types.string,
  title: types.maybe(types.string),
  scroll: 0,
  date: types.string,
});

export type IHistoryData = Instance<typeof HistoryData>;

export const Node = types
  .model({
    id: types.identifier,
    data: HistoryData, // as an example
    parent: types.maybe(types.reference(types.late((): IAnyModelType => Node))),
    children: types.array(
      types.reference(types.late((): IAnyModelType => Node))
    ),
  })
  .views((self) => ({
    showNode() {
      return `[${self.id.slice(0, 4)}]`;
    },
  }))
  .actions((self) => ({
    setParent(a: Instance<typeof self> | null) {
      log(`${self.showNode()} set parent ${a ? a.showNode() : 'null'}`);
      self.parent = a;
    },
    setData(a: IHistoryData) {
      self.data = a;
    },
    addChild(a: Instance<typeof self>) {
      self.children.push(a);
    },
    removeChild(a: Instance<typeof self>): boolean {
      log(`${self.showNode()} remove child ${a.showNode()}`);
      return self.children.remove(a);
    },
  }));

export type INode = Instance<typeof Node>;

export const HistoryStore = types
  .model({
    nodes: types.map(Node), // Node Id => Node
    heads: types.map(types.reference(Node)), // WebView Id => Node
    active: types.string, // WebView Id
    roots: types.array(types.reference(Node)),
  })
  .actions((self) => ({
    setNode(node: INode) {
      self.nodes.set(node.id, node);
    },
    setHead(webViewId: string, node: INode) {
      log(`${webViewId} set head ${node.showNode()} ${node.data.url}`);
      self.heads.set(webViewId, node);
    },
    removeHead(webViewId: string): boolean {
      return self.heads.delete(webViewId);
    },
    linkChild(parent: INode, child: INode) {
      log(
        `link ${parent.showNode()}(${parent.data.url}) to ${child.showNode()}(${
          child.data.url
        })`
      );
      parent.addChild(child);
      child.setParent(parent);
    },
    removeNode(a: INode) {
      log(`delete node ${a.showNode()}`);
      a.parent?.removeChild(a);
      a.children.forEach((child: INode) => {
        child.setParent(null);
      });
      self.nodes.delete(a.id);
    },
    setActive(webViewId: string) {
      if (webViewId !== self.active) {
        log(`swap active webView from (${self.active}) to (${webViewId})`);
        self.active = webViewId;
      }
    },
    addRoot(a: INode) {
      self.roots.push(a);
    },
  }));

export type IHistory = Instance<typeof HistoryStore>;

export function headsOnNode(
  root: IHistory,
  node: INode | undefined
): [string, INode][] {
  if (node) {
    const entries = Array.from(root.heads.entries());
    return entries.filter((entry) => {
      const head = entry[1];
      return head.id === node.id;
    });
  }
  return [];
}

function childLeaves(a: INode) {
  return a.children.filter((x) => x.children.length === 0);
}

function childParents(a: INode) {
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

function getDate(): string {
  return (Date.now() / 1000).toString();
}

function genNode(url: string) {
  const data = HistoryData.create({ url, scroll: 0, date: getDate() });
  return Node.create({ id: uuidv4(), data });
}

// function headKeyWhereNode(
//   history: IHistory,
//   destinationNode: INode
// ): number | undefined {
//   const match: number[] = [];
//   history.heads.forEach((node, key) => {
//     if (node.id === destinationNode.id) {
//       match.push(parseInt(key, 10));
//     }
//   });
//   if (match.length > 0) {
//     return match[0];
//   }
//   return undefined;
// }

function setTab(webViewId: number) {
  log(`dispatch set-tab to ${webViewId}`);
  ipcRenderer.send('set-tab', webViewId);
}

export function goBack(history: IHistory) {
  ipcRenderer.send('go-back', {
    senderId: history.active,
  });
}

export function goForward(history: IHistory) {
  log('=== go forward ===');
  ipcRenderer.send('go-forward', {
    senderId: history.active,
  });
  // const key = headKeyWhereNode(history, destinationNode);
  // if (key) {
  //   setTab(key);
  // } else {
  //   log(
  //     `${history.active} dispatch go forward to ${destinationNode.showNode()}`
  //   );
  //   ipcRenderer.send('go-forward', {
  //     senderId: history.active,
  //     forwardTo: getSnapshot(destinationNode),
  //   });
  // }
}

function handleGoForward(h: IHistory, webViewId: string, url: string) {
  const oldNode = h.heads.get(webViewId);
  if (oldNode) {
    const forwards = oldNode.children.filter((child) => child.data.url === url);
    if (forwards.length > 0) {
      h.setHead(webViewId, forwards[0]);
    }
  }
}

function parentIsUrl(oldNode: INode | undefined, url: string) {
  return oldNode && oldNode.parent && oldNode.parent.data.url === url;
}

function childrenWithUrl(node: INode | undefined, url: string): INode[] {
  if (node) {
    return node.children.filter((child) => child.data.url === url);
  }
  return [];
}

export function spawnNewWindow(h: IHistory, senderId: string, url: string) {
  log('=== new window intercept ===');
  log(`${senderId} dispatch spawn window for ${url}`);

  const oldNode = h.heads.get(senderId);
  const matchNode = childrenWithUrl(oldNode, url);
  const heads = headsOnNode(h, matchNode[0]);

  if (heads.length > 0) {
    const [headId, node] = heads[0];
    log(
      `${senderId} child ${node.showNode()} with active webView ${headId} matches ${url}`
    );
  }

  ipcRenderer.send('request-new-window', { senderId, url });

  // todo remove this (we used to prevent duplication of windows when a child with same url exists)
  // if (heads.length > 0) {
  //   const [headId, node] = heads[0];
  //   log(
  //     `${senderId} child ${node.showNode()} with active webView ${headId} matches ${url}`
  //   );
  // } else {
  //   log(`${senderId} dispatch spawn window for ${url}`);
  //   ipcRenderer.send('request-new-window', { senderId, url });
  // }
}

export function hookListeners(h: Instance<typeof HistoryStore>) {
  ipcRenderer.on('new-window-intercept', (_, data) => {
    const { senderId, details } = data;
    const { url } = details;
    spawnNewWindow(h, senderId, url);
  });
  ipcRenderer.on('new-window', (_, data) => {
    const { senderId, receiverId, url } = data;
    log('=== new window ===');
    log(`${senderId} spawn ${receiverId} for ${url}`);
    const oldNode = h.heads.get(senderId);
    const twins = childrenWithUrl(oldNode, url);
    if (twins.length > 0) {
      const twin = twins[0];
      log(`${senderId} has child ${twin.showNode()} for ${url}`);
      h.setHead(receiverId, twin);
    } else {
      const receiverNode = genNode(url);
      log(`${receiverId} create node ${receiverNode.showNode()} for ${url}`);
      h.setNode(receiverNode);
      const senderNode = h.heads.get(senderId);
      if (senderNode) {
        h.linkChild(senderNode, receiverNode);
      }
      h.setHead(receiverId, receiverNode);
    }
  });
  ipcRenderer.on('tab-was-set', (_, id) => {
    const idStr = id.toString();
    if (h.active !== idStr) {
      h.setActive(id.toString());
    }
  });
  ipcRenderer.on('will-navigate', (_, { id, url }) => {
    ipcRenderer.send('mixpanel-track', 'history will navigate');
    log('=== will-navigate ===');
    const oldNode = h.heads.get(id);
    if (!(oldNode && oldNode.data.url === url)) {
      if (parentIsUrl(oldNode, url)) {
        log('nav to parent');
        h.setHead(id, oldNode?.parent);
      } else {
        const twins = childrenWithUrl(oldNode, url);
        if (twins.length > 0) {
          log(`${id} did set to existing child ${url}`);
          h.setHead(id, twins[0]);
        } else {
          const node = genNode(url);
          log(`${id} did create node ${node.showNode()} for ${url}`);
          h.setNode(node);
          if (oldNode) {
            h.linkChild(oldNode, node);
          }
          h.setHead(id, node);
        }
      }
    }
  });
  ipcRenderer.on('will-navigate-no-gesture', (_, { id, url }) => {
    // todo: this works but could be cleaned up if more logic needs to be added
    const node = h.heads.get(id);
    const urlIsNew = node?.data.url !== url;
    if (node && url && urlIsNew) {
      const twins = childrenWithUrl(node.parent, url);
      if (twins.length > 0) {
        const twin = twins[0];
        const heads = headsOnNode(h, twin);
        if (heads.length > 0) {
          const headId = heads[0][0];
          if (h.active === id.toString()) {
            h.setActive(headId);
            setTab(parseInt(headId, 10));
            ipcRenderer.send('remove-tab', id);
          } else {
            log(
              `${headId} is active on ${twin.showNode()} so will remove ${id}`
            );
            ipcRenderer.send('remove-tab', id);
          }
        } else {
          log(
            `${id} remove ${node.showNode()} and set head for twin ${twin.showNode()} at ${url}`
          );
          h.setHead(id, twin);
        }
        h.removeNode(node);
      } else {
        log(
          `${id} will-navigate-no-gesture swap data for ${node.showNode()} ${url}`
        );
        const data = HistoryData.create({ url, scroll: 0, date: getDate() });
        node.setData(data);
      }
    }
  });
  ipcRenderer.on('did-navigate', (_, { id, url }) => {
    // log(`${id} did navigate ${url}`);
    const rootNode = h.heads.get(id);
    if (!rootNode) {
      const node = genNode(url);
      log(`${id} did create root ${node.showNode()} for ${url}`);
      h.setNode(node);
      h.setHead(id, node);
      h.addRoot(node);
    }
  });
  ipcRenderer.on('go-back', (_, { id }) => {
    // log(`${id} did go back`);
    const oldNode = h.heads.get(id);
    if (oldNode && oldNode.parent) {
      log(`${id} receive go-back`);
      h.setHead(id, oldNode.parent);
    }
  });
  ipcRenderer.on('go-forward', (_, { id, url }) => {
    log(`${id} did go forward to ${url}`);
    handleGoForward(h, id, url);
  });
  ipcRenderer.on('go-pseudo-forward', (_, { id, url }) => {
    log(`${id} go-pseudo-forward ${url}`);
    handleGoForward(h, id, url);
  });
  ipcRenderer.on('tab-removed', (_, id) => {
    log(`try remove head ${id}`);
    if (h.removeHead(id)) {
      log(`removed head ${id}`);
    }
  });
  ipcRenderer.on('title-updated', (_, [id, title]) => {
    log(`${id} update title to ${title}`);
    const node = h.heads.get(id);
    if (node) {
      node.setData({ ...node.data, title });
    }
  });
  ipcRenderer.on('go-back-from-floating', () => {
    goBack(h);
  });
}
