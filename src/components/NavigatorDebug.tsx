import React from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '../store/tab-page-store';
import { headsOnNode, INode } from '../store/history-store';

const DebugNode = observer(({ node }: { node: INode }) => {
  const { historyStore } = useStore();
  const heads = headsOnNode(historyStore, node);
  const Heads = () => {
    if (heads.length === 0) {
      return <span>{'[] '}</span>;
    }
    return (
      <span>
        [
        {heads.map(([key, _]) => {
          return <span key={key}>{key}</span>;
        })}
        {'] '}
      </span>
    );
  };
  const title = node.data.title ? node.data.title : node.data.url;
  return (
    <li>
      <Heads />
      {title}
      <ul>
        {Array.from(node.children.values()).map((child) => (
          <DebugNode key={node.id} node={child} />
        ))}
      </ul>
    </li>
  );
});

const NavigatorDebug = observer(() => {
  const { historyStore } = useStore();
  return (
    <div>
      <h1>Debug</h1>
      <ul>
        {historyStore.roots.map((root: INode) => (
          <DebugNode key={root.id} node={root} />
        ))}
      </ul>
    </div>
  );
});

export default NavigatorDebug;
