import React, { useRef } from 'react';
import styled, { css } from 'styled-components';
import { observer } from 'mobx-react-lite';
import { ipcRenderer } from 'electron';
import { useStore } from '../store/tab-page-store';
import { goBack, goForward, INode } from '../store/history-store';

const NavigatorParent = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-wrap: wrap;
  align-content: center;
  justify-content: space-between;
`;

const NavigatorPanel = styled.div`
  background: rgba(0, 0, 0, 0.25);
  border-radius: 0.5rem;
  overflow: scroll;
  ::-webkit-scrollbar {
    display: none;
  }
  div + div {
    margin-top: 10px;
  }
  ${({
    width,
    height,
    margin,
  }: {
    width: string;
    height: string;
    margin: string;
  }) => css`
    height: ${height};
    margin: 0 ${margin} 0 ${margin};
    width: ${width};
  `}
`;

const NavigatorItemParent = styled.div`
  user-select: none;
  cursor: default;
  font-size: 0.75rem;
  color: white;
  width: calc(100% - 0.5rem);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  //padding-top: 56.25%;
  background-color: rgba(100, 100, 100, 1);
  padding: 0.5rem 0 0.5rem 0.5rem;
  border-radius: 0.5rem;
`;

interface Dimensions {
  width: number;
  height: number;
  margin: number;
}

function asPx(a: number) {
  return `${a}px`;
}

enum Direction {
  Back,
  Forward,
}

const NavigatorItem = observer(
  ({ node, dir }: { node: INode; dir: Direction }) => {
    const { historyStore } = useStore();
    const title = node.data.title ? node.data.title : node.data.url;
    return (
      <NavigatorItemParent
        onClick={() => {
          if (dir === Direction.Back) {
            goBack(historyStore, node);
          }
          if (dir === Direction.Forward) {
            goForward(historyStore, node);
          }
        }}
      >
        {title}
      </NavigatorItemParent>
    );
  }
);

const Panel = observer(
  ({
    items,
    dim,
    dir,
  }: {
    items: INode[];
    dim: Dimensions;
    dir: Direction;
  }) => {
    const { width, height, margin } = dim;
    return (
      <NavigatorPanel
        width={asPx(width)}
        height={asPx(height)}
        margin={asPx(margin)}
      >
        {items.map((item) => (
          <NavigatorItem key={item.id} node={item} dir={dir} />
        ))}
      </NavigatorPanel>
    );
  }
);

const Navigator = observer(() => {
  const backRef = useRef(null);
  const { tabPageStore, historyStore } = useStore();
  const gutter =
    (tabPageStore.screen.width - tabPageStore.innerBounds.width) / 2;
  const margin = 20;
  const width = gutter - 2 * margin;
  const { height } = tabPageStore.innerBounds;
  const head = historyStore.heads.get(historyStore.active);
  const leftItems = head && head.parent ? [head.parent] : [];
  const rightItems = head ? head.children.slice().reverse() : [];
  return (
    <NavigatorParent
      ref={backRef}
      onClick={(e) => {
        if (backRef.current && e.target === backRef.current) {
          ipcRenderer.send('click-main');
        }
      }}
    >
      <Panel
        dir={Direction.Back}
        items={leftItems}
        dim={{ width, height, margin }}
      />
      <Panel
        dir={Direction.Forward}
        items={rightItems}
        dim={{ width, height, margin }}
      />
    </NavigatorParent>
  );
});

export default Navigator;
