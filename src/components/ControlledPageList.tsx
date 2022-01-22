import React, { useCallback, useEffect, useRef, useState } from 'react';
import { runInAction } from 'mobx';
import { bind, unbind } from 'mousetrap';
import { Stack } from '@mui/material';
import styled from 'styled-components';
import { observer } from 'mobx-react-lite';
import { relativeItem } from '../utils/utils';
import { ListItem, Trigger } from '../interface/ListItem';
import { useStore } from '../store/tab-page-store';

const WrappedListItem = ({
  id,
  active,
  children,
  onClick = () => {},
  onMouseEnter = () => {},
  onMouseLeave = () => {},
  onMouseChill = () => {},
}: {
  id: string;
  active: boolean;
  children: React.ReactNode;
  onClick?: (trigger: 'mouse' | 'hotkey') => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onMouseChill?: () => void;
}) => {
  useEffect(() => {
    const h = setTimeout(() => {
      if (active) {
        onMouseChill();
      }
    }, 100);
    return () => {
      clearTimeout(h);
    };
  }, [onMouseChill, active]);

  return (
    // todo why tho
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events,jsx-a11y/no-static-element-interactions
    <div
      id={id}
      onClick={() => {
        onClick('mouse');
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>
  );
};

const HiddenScrollbarStack = styled(Stack)`
  position: relative;

  ::-webkit-scrollbar {
    display: none;
  }
`;

const ControlledList = observer(
  ({
    items,
    initialHighlightedItemId,
    snapToFirst = true,
    safeKeysOnly = false,
    resetHighlightOnChange = false,
    uncappedTop = false,
  }: {
    items: ListItem[];
    initialHighlightedItemId: string;
    snapToFirst?: boolean;
    safeKeysOnly?: boolean;
    resetHighlightOnChange?: boolean;
    uncappedTop?: boolean;
  }) => {
    const { tabPageStore } = useStore();
    const [highlightedTabId, setHighlightedTabId] = useState<string>(
      initialHighlightedItemId
    );

    const [mouseEnabled, setMouseEnabled] = useState(false);

    const scrollBoxRef = useRef<HTMLDivElement>(null);

    // todo make this more efficient
    useEffect(() => {
      if (snapToFirst) {
        const firstTab = items[0];
        const highlightedTab = items.find((tab) => tab.id === highlightedTabId);
        if (
          typeof highlightedTab === 'undefined' &&
          typeof firstTab !== 'undefined'
        )
          runInAction(() => {
            setHighlightedTabId(firstTab.id);
          });
      }
    }, [highlightedTabId, items, snapToFirst]);

    useEffect(() => {
      if (resetHighlightOnChange) {
        setHighlightedTabId('-1');
      }
    }, [items, resetHighlightOnChange]);

    const moveTabSelection = useCallback(
      (direction: 'up' | 'down') => {
        setMouseEnabled(false);
        const root = items.find((tab) => {
          return tab.id === highlightedTabId;
        });
        const invokeLazyChange = (id: string) => {
          const item = items.find((tab) => {
            return tab.id === id;
          });
          if (
            typeof item !== 'undefined' &&
            typeof item.onLazyIdChange !== 'undefined'
          ) {
            item.onLazyIdChange();
          }
        };
        if (typeof root !== 'undefined') {
          const id = relativeItem(root, items, direction);
          if (typeof id !== 'undefined') {
            const listItem = document.getElementById(id);
            if (listItem && scrollBoxRef.current) {
              const distFromTop =
                listItem.offsetTop - scrollBoxRef.current.scrollTop;
              const distFromBottom =
                scrollBoxRef.current.clientHeight -
                distFromTop -
                listItem.offsetHeight;

              if (distFromTop < 0) {
                scrollBoxRef.current.scrollTop += distFromTop;
              }

              if (distFromBottom < 0) {
                scrollBoxRef.current.scrollTop -= distFromBottom;
              }
            }

            setHighlightedTabId(id);
            invokeLazyChange(id);
          } else if (uncappedTop) {
            setHighlightedTabId('-1');
            invokeLazyChange('-1');
          }
        } else {
          const topTab = items[0];
          if (typeof topTab !== 'undefined') {
            setHighlightedTabId(topTab.id);
            invokeLazyChange(topTab.id);
          }
        }
      },
      [uncappedTop, items, highlightedTabId]
    );

    const closeHighlightedTab = useCallback(
      (trigger: Trigger) => {
        const idToRemove = highlightedTabId;
        const idx = items.findIndex((tab) => {
          return tab.id === idToRemove;
        });
        const highlightedItem = items.find(
          (tab) => tab.id === highlightedTabId
        );

        if (
          typeof highlightedItem !== 'undefined' &&
          typeof highlightedItem.delete !== 'undefined'
        ) {
          if (idx !== -1) {
            if (
              idx === items.length - 1 &&
              highlightedItem.delete.bounceOffEnd
            ) {
              moveTabSelection('up');
            } else {
              moveTabSelection('down');
            }
          }
          highlightedItem.delete.onClick(trigger);
          setMouseEnabled(false);
        }
      },
      [highlightedTabId, items, moveTabSelection]
    );

    const clickHighlightedTab = useCallback(
      (trigger: 'mouse' | 'hotkey') => {
        // ipcRenderer.send('set-tab', highlightedTabId);
        const highlightedItem = items.find(
          (tab) => tab.id === highlightedTabId
        );
        if (
          typeof highlightedItem !== 'undefined' &&
          typeof highlightedItem.onClick !== 'undefined'
        ) {
          highlightedItem.onClick(trigger);
        }
      },
      [highlightedTabId, items]
    );

    const altClickHighlightedTab = useCallback(
      (trigger: 'mouse' | 'hotkey', move = true) => {
        const highlightedItem = items.find(
          (tab) => tab.id === highlightedTabId
        );
        const idx = items.findIndex((tab) => {
          return tab.id === highlightedTabId;
        });
        if (
          typeof highlightedItem !== 'undefined' &&
          typeof highlightedItem.onAltClick !== 'undefined'
        ) {
          if (idx !== -1 && move) {
            if (idx !== items.length - 1) {
              moveTabSelection('down');
            }
          }
          highlightedItem.onAltClick(trigger);
        }
      },
      [highlightedTabId, items]
    );

    useEffect(() => {
      const highlightedItem = items.find((tab) => tab.id === highlightedTabId);
      let enterHandle = '';
      if (
        typeof highlightedItem !== 'undefined' &&
        typeof highlightedItem.onClick !== 'undefined'
      ) {
        runInAction(() => {
          tabPageStore.preventBonsaiBoxEnter = true;
        });
        enterHandle = tabPageStore.registerKeybind('enter', () => {
          tabPageStore.bonsaiBoxRef?.current?.blur();
          clickHighlightedTab('hotkey');
        });
      } else {
        runInAction(() => {
          tabPageStore.preventBonsaiBoxEnter = false;
        });
      }
      return () => {
        runInAction(() => {
          tabPageStore.preventBonsaiBoxEnter = false;
        });
        if (enterHandle) {
          tabPageStore.unregisterKeybind(enterHandle);
        }
      };
    }, [tabPageStore, highlightedTabId, items, clickHighlightedTab]);

    useEffect(() => {
      const downKeys = ['down', 'ctrl+j'].concat(safeKeysOnly ? [] : ['j']);
      const upKeys = ['up', 'ctrl+k'].concat(safeKeysOnly ? [] : ['k']);
      const closeKeys = ['del', 'command+w', 'ctrl+w'].concat(
        safeKeysOnly ? [] : ['w']
      );

      const toggleAddTag = () => {
        const highlightedItem = items.find(
          (tab) => tab.id === highlightedTabId
        );
        if (highlightedItem && highlightedItem.onTag) {
          highlightedItem.onTag();
        }
      };

      bind('shift+enter', () => {
        tabPageStore.bonsaiBoxRef?.current?.blur();
        altClickHighlightedTab('hotkey', true);
      });
      bind(downKeys, () => {
        moveTabSelection('down');
      });
      bind(upKeys, () => {
        moveTabSelection('up');
      });
      bind(closeKeys, () => {
        if (!tabPageStore.bonsaiBoxFocus) {
          closeHighlightedTab('hotkey');
        }
      });
      bind('d', () => {
        if (!tabPageStore.bonsaiBoxFocus) {
          toggleAddTag();
        }
      });
      bind(['command+d', 'ctrl+d'], () => {
        toggleAddTag();
      });
      // bind(['g g'], (e) => {
      //   if (!this.bonsaiBoxFocus) {
      //     e.preventDefault();
      //     this.teleportHomeCursor('top');
      //   }
      // });
      // bind(['G'], (e) => {
      //   if (!this.bonsaiBoxFocus) {
      //     e.preventDefault();
      //     this.teleportHomeCursor('bottom');
      //   }
      // });
      return () => {
        unbind(downKeys);
        unbind(upKeys);
        unbind(closeKeys);
        unbind(['command+d', 'ctrl+d']);
        unbind('d');
      };
    }, [
      tabPageStore.bonsaiBoxFocus,
      highlightedTabId,
      safeKeysOnly,
      closeHighlightedTab,
      moveTabSelection,
    ]);

    const itemElements = items.map(
      ({ id, Node, onClick: onClickItem, onLazyIdChange, onIdChange }) => {
        const active = id === highlightedTabId;
        return (
          <WrappedListItem
            id={id}
            key={id}
            active={active}
            onMouseEnter={() => {
              if (mouseEnabled) {
                setHighlightedTabId(id);
                if (typeof onIdChange !== 'undefined') {
                  onIdChange();
                }
              }
            }}
            onMouseChill={() => {
              if (typeof onLazyIdChange !== 'undefined') {
                onLazyIdChange();
              }
            }}
            onClick={onClickItem}
          >
            <Node active={active} />
          </WrappedListItem>
        );
      }
    );

    useEffect(() => {
      if (scrollBoxRef && scrollBoxRef.current) {
        const handleAuxClick = () => {
          altClickHighlightedTab('mouse', false);
        };
        scrollBoxRef.current.addEventListener('auxclick', handleAuxClick);
        const foo = scrollBoxRef.current;
        return () => {
          foo.removeEventListener('auxclick', handleAuxClick);
        };
      }
      return () => {};
    }, [altClickHighlightedTab, highlightedTabId]);

    return (
      <HiddenScrollbarStack
        ref={scrollBoxRef}
        spacing={0}
        onMouseMove={() => {
          setMouseEnabled(true);
        }}
        sx={{
          padding: '0 0 36px 0',
          flexGrow: 1,
          height: 0,
          overflowY: 'auto',
        }}
      >
        {itemElements}
      </HiddenScrollbarStack>
    );
  }
);

export default ControlledList;
