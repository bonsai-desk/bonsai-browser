import React, { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { ipcRenderer } from 'electron';
import styled from 'styled-components';
import {
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { bind, unbind } from 'mousetrap';
import { Add, ArrowForwardRounded } from '@mui/icons-material';
import { makeAutoObservable, runInAction, toJS } from 'mobx';
import { TagWithTitle } from '../watermelon/components/Tag';

const Background = styled.div`
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
`;

const style = (highlighted: boolean) => {
  const regularColor = 'white';
  const highlightedColor = '#e5e5e5';
  const color = highlighted ? highlightedColor : regularColor;
  return {
    transitionDuration: '0s',
    backgroundColor: color,
    '&:hover': { backgroundColor: color },
    height: '55px',
  };
};

function send(event: string, data: any = null) {
  ipcRenderer.send('tag-modal-message', [event, data]);
}

const TagListItem = observer(
  ({
    id,
    checked,
    title,
    highlighted,
    onClick,
    onMouseMove,
  }: {
    id: string;
    checked: boolean;
    title: string;
    highlighted: boolean;
    onClick: () => void;
    onMouseMove: () => void;
  }) => {
    return (
      <ListItem
        id={id}
        disablePadding
        onMouseMove={onMouseMove}
        secondaryAction={
          highlighted ? (
            // without the backgroundColor it looks like the arrow is referring to clicking the whole item, no the actual button
            // backgroundColor is ugly, but maybe we still need something?
            // maybe it should just be text in a mui chip?
            <Tooltip title="Ctrl L">
              <IconButton
                edge="end"
                sx={{ backgroundColor: '#eeeeee' }}
                onClick={() => {
                  send('go-to-tag', title);
                }}
              >
                <ArrowForwardRounded />
              </IconButton>
            </Tooltip>
          ) : null
        }
      >
        <ListItemButton sx={style(highlighted)} onClick={onClick} dense>
          {checked ? (
            <TagWithTitle tagTitle={title} onClick={() => {}} /> // empty onClick to make cursor switch to pointer. event will be propagated to parent
          ) : (
            <ListItemText primary={title} />
          )}
        </ListItemButton>
      </ListItem>
    );
  }
);

const TagListCreateItem = observer(
  ({
    id,
    title,
    highlighted,
    onClick,
    onMouseMove,
  }: {
    id: string;
    title: string;
    highlighted: boolean;
    onClick: () => void;
    onMouseMove: () => void;
  }) => {
    return (
      <ListItem id={id} disablePadding onMouseMove={onMouseMove}>
        <ListItemButton sx={style(highlighted)} onClick={onClick} dense>
          <ListItemIcon>
            <Add />
          </ListItemIcon>
          <ListItemText
            primary={
              <Typography>
                Create new tag: &quot;
                <span style={{ color: '#0000aa' }}>{title}</span>&quot;
              </Typography>
            }
            sx={{ fontWeight: 'bold' }}
          />
        </ListItemButton>
      </ListItem>
    );
  }
);

export interface TagModalData {
  tagListInfo: { checked: boolean; title: string }[];
  allowCreateNewTag: boolean;
}

class DataStore {
  data: TagModalData = {
    tagListInfo: [],
    allowCreateNewTag: false,
  };

  constructor() {
    makeAutoObservable(this);
  }
}

const dataStore = new DataStore();

const TagModal = observer(() => {
  const tagInputRef = useRef<HTMLInputElement>(null);
  const scrollBoxRef = useRef<HTMLUListElement>(null);
  const [tagInput, setTagInput] = useState('');
  const [usingMouse, setUsingMouse] = useState(false);
  const [cursorIndex, setCursorIndex] = useState(0);

  function setCursor(cursorPosition: number, updateScroll = false) {
    setCursorIndex(cursorPosition);

    const listItem = document.getElementById(cursorPosition.toString());
    if (!listItem || !scrollBoxRef.current || !updateScroll) {
      return;
    }

    const distFromTop = listItem.offsetTop - scrollBoxRef.current.scrollTop;
    const distFromBottom =
      scrollBoxRef.current.clientHeight - distFromTop - listItem.offsetHeight;

    if (distFromTop < 0) {
      scrollBoxRef.current.scrollTop += distFromTop;
    }

    if (distFromBottom < 0) {
      scrollBoxRef.current.scrollTop -= distFromBottom;
    }
  }

  useEffect(() => {
    ipcRenderer.on('set-data', (_, newData) => {
      runInAction(() => {
        dataStore.data = newData;
      });
    });
    ipcRenderer.on('clear-input', () => {
      setTagInput('');
      send('tag-input-change', '');
      setCursorIndex(0);
      setUsingMouse(false);
      if (scrollBoxRef.current) {
        scrollBoxRef.current.scrollTop = 0;
      }
    });
    const interval = setInterval(() => {
      if (tagInputRef.current !== document.activeElement) {
        tagInputRef.current?.focus();
      }
    }, 100);
    return () => {
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    function moveCursorUp() {
      if (cursorIndex === 0) {
        return;
      }
      setCursor(cursorIndex - 1, true);
    }

    function moveCursorDown() {
      if (
        cursorIndex ===
        dataStore.data.tagListInfo.length -
          1 +
          (dataStore.data.allowCreateNewTag ? 1 : 0)
      ) {
        return;
      }
      setCursor(cursorIndex + 1, true);
    }

    function handleEnter() {
      if (
        cursorIndex === dataStore.data.tagListInfo.length &&
        dataStore.data.allowCreateNewTag
      ) {
        send('clicked-create-tag', tagInput);
      } else {
        const tagEntry = dataStore.data.tagListInfo[cursorIndex];
        if (tagEntry) {
          send('clicked-tag-entry', toJS(tagEntry));
          if (cursorIndex !== dataStore.data.tagListInfo.length - 1) {
            moveCursorDown();
          }
        }
      }
    }

    bind('escape', () => {
      if (tagInput !== '') {
        setUsingMouse(false);
        setTagInput('');
        send('tag-input-change', '');
        if (scrollBoxRef.current) {
          scrollBoxRef.current.scrollTop = 0;
        }
      } else {
        send('pressed-escape');
        setUsingMouse(false);
      }
    });
    bind(['command+d', 'ctrl+d'], () => {
      send('d');
      setUsingMouse(false);
    });
    bind('up', (e) => {
      e.preventDefault();
      moveCursorUp();
    });
    bind(['down', 'tab'], (e) => {
      e.preventDefault();
      moveCursorDown();
    });
    bind(['command+k', 'ctrl+k'], () => {
      moveCursorUp();
    });
    bind(['command+j', 'ctrl+j'], () => {
      moveCursorDown();
    });
    bind('enter', (e) => {
      e.preventDefault();
      handleEnter();
    });
    // bind(['command+enter', 'ctrl+enter'], (e) => {
    //   e.preventDefault();
    //   handleEnter();
    //   send('pressed-ctrl-enter');
    //   setUsingMouse(false);
    // });
    bind(['shift+enter', 'shift+enter'], (e) => {
      e.preventDefault();
      const tagEntry = dataStore.data.tagListInfo[cursorIndex];
      if (tagEntry) {
        send('pressed-shift-enter', tagEntry.title);
      }
    });
    bind(['command+l', 'ctrl+l', 'right'], (e) => {
      e.preventDefault();
      const tagEntry = dataStore.data.tagListInfo[cursorIndex];
      if (tagEntry) {
        send('go-to-tag', tagEntry.title);
      }
    });
    return () => {
      unbind('escape');
      unbind(['command+d', 'ctrl+d']);
      unbind('up');
      unbind(['down', 'tab']);
      unbind(['command+k', 'ctrl+k']);
      unbind(['command+j', 'ctrl+j']);
      unbind('enter');
      // unbind(['command+enter', 'ctrl+enter']);
      unbind(['shift+enter', 'shift+enter']);
      unbind(['command+l', 'ctrl+l', 'right']);
    };
  }, [cursorIndex, tagInput]);

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (Math.abs(e.movementX) > 0 || Math.abs(e.movementY) > 0) {
        setUsingMouse(true);
      }
    }

    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const tagElements = dataStore.data.tagListInfo.map((tagEntry, index) => {
    return (
      <TagListItem
        id={index.toString()}
        key={tagEntry.title}
        checked={tagEntry.checked}
        title={tagEntry.title}
        highlighted={index === cursorIndex}
        onClick={() => {
          send('clicked-tag-entry', toJS(tagEntry));
        }}
        onMouseMove={() => {
          if (!usingMouse) {
            return;
          }

          if (index !== cursorIndex) {
            setCursor(index);
          }
        }}
      />
    );
  });

  const tagContent =
    dataStore.data.tagListInfo.length === 0 &&
    !dataStore.data.allowCreateNewTag ? (
      <div style={{ paddingLeft: '25px' }}>
        You don&apos;t have any tags. Start typing to create a new tag.
      </div>
    ) : (
      tagElements
    );

  return (
    <Background
      onMouseDown={() => {
        send('click-background');
        setUsingMouse(false);
      }}
    >
      <Paper
        sx={{
          width: '600px',
          height: '350px',
          display: 'flex',
          flexDirection: 'column',
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
        }}
      >
        <TextField
          inputRef={tagInputRef}
          label="Tag Name"
          variant="filled"
          inputProps={{ className: 'mousetrap' }}
          autoFocus
          sx={{ width: '100%' }}
          onChange={(e) => {
            setCursorIndex(0);
            setUsingMouse(false);
            setTagInput(e.currentTarget.value);
            send('tag-input-change', e.currentTarget.value);
            if (scrollBoxRef.current) {
              scrollBoxRef.current.scrollTop = 0;
            }
          }}
          value={tagInput}
          onBlur={() => {
            setTimeout(() => {
              tagInputRef.current?.focus();
            }, 0);
          }}
        />
        <List
          ref={scrollBoxRef}
          sx={{ width: '100%', flexGrow: '1', overflowY: 'scroll' }}
        >
          {tagContent}
          {dataStore.data.allowCreateNewTag ? (
            <TagListCreateItem
              id={dataStore.data.tagListInfo.length.toString()}
              title={tagInput}
              highlighted={dataStore.data.tagListInfo.length === cursorIndex}
              onClick={() => {
                send('clicked-create-tag', tagInput);
              }}
              onMouseMove={() => {
                if (!usingMouse) {
                  return;
                }

                if (dataStore.data.tagListInfo.length !== cursorIndex) {
                  setCursor(dataStore.data.tagListInfo.length);
                }
              }}
            />
          ) : null}
        </List>
      </Paper>
    </Background>
  );
});

export default TagModal;
