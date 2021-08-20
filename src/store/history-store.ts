import { IAnyModelType, Instance, types } from 'mobx-state-tree';
// import { v4 as uuidv4 } from 'uuid';

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
    setParent(a: Instance<typeof self>) {
      self.parent = a;
    },
    setData(a: Instance<typeof HistoryData>) {
      self.data = a;
    },
    addChild(a: Instance<typeof self>) {
      self.children.push(a);
    },
  }));

export const Root = types
  .model({
    nodes: types.map(Node),
  })
  .actions((self) => ({
    addNode(node: Instance<typeof Node>) {
      self.nodes.set(node.id, node);
    },
    linkChild(parent: Instance<typeof Node>, child: Instance<typeof Node>) {
      parent.addChild(child);
      child.setParent(parent);
    },
  }));

// export const A = types
//   .model({
//     id: types.identifier,
//     b: types.maybe(types.reference(types.late(() => B))),
//   })
//   .actions((self) => ({
//     addB(b: Instance<typeof B>) {
//       self.b = b;
//     },
//   }));

// export const Root = types
//   .model({
//     as: types.map(A),
//     bs: types.map(B),
//   })
//   .actions((self) => ({
//     addA(a: Instance<typeof A>) {
//       self.as.set(a.id, a);
//     },
//     addB(b: Instance<typeof B>) {
//       self.bs.set(b.id, b);
//     },
//   }));
