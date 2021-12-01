import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { runInAction } from 'mobx';
import { ipcRenderer } from 'electron';
import {
  ExitToApp,
  Dashboard,
  AccountBox,
  Comment,
  Keyboard,
} from '@material-ui/icons';
import {
  Toolbar,
  Avatar,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
  Grid,
  Paper,
  Container,
} from '@material-ui/core';
import GenericModal from './GenericModal';
import { useStore, View } from '../store/tab-page-store';
import MiniGenericModal from './MiniGenericModal';
import '../index.css';
import {
  BlueButton,
  Button as BonsaiButton,
  ButtonBase,
  InertButtonStyle,
  StretchButton,
  StretchButtonInert,
} from './StretchButton';
import refreshIcon from '../../assets/refresh.svg';
import { bindEquals, globalKeybindValid, showKeys } from '../store/keybinds';
import Storyboard from './StoryBoard';

const Title = styled.div`
  font-size: 2rem;
  font-weight: bold;
`;

export const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  width: 100%;

  #button + #button {
    margin: 0 0 0 0.5rem;
  }
`;

const RebindContainer = styled.div`
  width: 40rem;
  height: 20rem;
  display: flex;
  flex-wrap: wrap;
  align-content: space-between;
`;

export const KeyBindBox = styled.div`
  position: relative;
  display: flex;
  flex-wrap: wrap;
  font-weight: bold;
  background-color: rgba(0, 0, 0, 0.05);
  padding: 0 1rem 0 1rem;
  border-radius: 10px;
  width: 15rem;
  height: 3.5rem;
  align-content: center;
`;

export const DynamicKeyBindBox = styled(KeyBindBox)`
  cursor: pointer;
  transition-duration: 0.1s;
  :hover {
    background-color: rgba(0, 0, 0, 0.2);
  }
`;

export const ResetButton = styled(ButtonBase)`
  position: absolute;
  right: -2.5rem;
  top: 0.75rem;
  height: 2rem;
  width: 2rem;
  border-radius: 50%;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-content: center;
`;

export const ResetButtonIcon = styled.img`
  -webkit-user-drag: none;
`;

export interface IRebindModal {
  active: boolean;
  closeCallback?: () => void;
}

const RebindModal = observer(({ active }: IRebindModal) => {
  const { tabPageStore, keybindStore } = useStore();
  const id = tabPageStore.rebindModalId;
  const bind = keybindStore.binds.get(id);
  const bindKeys =
    tabPageStore.bindKeys.length > 0 ? tabPageStore.bindKeys : ['None'];
  const bindIsDefault = bind ? bindEquals(bindKeys, bind.defaultBind) : true;
  useEffect(() => {
    if (active) {
      ipcRenderer.send('disable-hotkeys');
    }
    return () => {
      ipcRenderer.send('enable-hotkeys');
    };
  }, [active]);
  const keysValid = globalKeybindValid(bindKeys);
  return (
    <MiniGenericModal active={active}>
      <RebindContainer>
        <Row>
          <Title>Shortcut: {bind ? bind.name : '?'}</Title>
        </Row>
        <Row style={{ justifyContent: 'center' }}>
          <div>
            <KeyBindBox>
              {showKeys(bindKeys)}
              <ResetButton style={{ opacity: bindIsDefault ? '20%' : '100%' }}>
                <ResetButtonIcon
                  onClick={() => {
                    runInAction(() => {
                      if (bind) {
                        tabPageStore.bindKeys = bind.defaultBind;
                      }
                    });
                  }}
                  src={refreshIcon}
                />
              </ResetButton>
            </KeyBindBox>
          </div>
        </Row>
        <Row style={{ justifyContent: 'flex-end' }}>
          <BonsaiButton
            id="button"
            onClick={() => {
              runInAction(() => {
                tabPageStore.rebindModalId = '';
              });
            }}
          >
            Cancel
          </BonsaiButton>
          <BlueButton
            style={keysValid ? {} : InertButtonStyle}
            onClick={() => {
              if (bind && keysValid) {
                runInAction(() => {
                  bind.setCurrentBind(tabPageStore.bindKeys);
                  keybindStore.saveSnapshot();
                  ipcRenderer.send('rebind-hotkey', {
                    hotkeyId: tabPageStore.rebindModalId,
                    newBind: [...tabPageStore.bindKeys],
                  });
                  tabPageStore.rebindModalId = '';
                });
              }
            }}
            id="button"
          >
            Ok
          </BlueButton>
        </Row>
      </RebindContainer>
    </MiniGenericModal>
  );
});

interface IKeyBindButton {
  id: string;
  clickable?: boolean;
}

const KeyBindButton = observer(({ id, clickable = false }: IKeyBindButton) => {
  const { tabPageStore, keybindStore } = useStore();
  const bind = keybindStore.binds.get(id);
  if (clickable) {
    return (
      <StretchButton
        onClick={() => {
          if (clickable) {
            runInAction(() => {
              tabPageStore.rebindModalId = id;
              tabPageStore.bindKeys = bind ? bind.currentBind : [];
            });
          }
        }}
      >
        {bind?.showCode()}
      </StretchButton>
    );
  }
  return <StretchButtonInert>{bind?.showCode()}</StretchButtonInert>;
});

function ConfirmLogout() {
  const [open, setOpen] = React.useState(false);

  const { tabPageStore } = useStore();

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleClickLogout = () => {
    tabPageStore.clearSession();
    setOpen(false);
  };

  return (
    <>
      <ListItem disablePadding>
        <ListItemButton onClick={handleClickOpen}>
          <ListItemIcon>
            <ExitToApp />
          </ListItemIcon>
          <ListItemText primary="Log Out" />
        </ListItemButton>
      </ListItem>

      <Dialog
        open={open}
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">Log Out?</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            You will need to log back in.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleClickLogout} autoFocus>
            Log Out
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

const AccountInfo = observer(() => {
  const { tabPageStore } = useStore();
  let email = 'email@address.com';

  let user = null;
  const { session } = tabPageStore;
  if (session && session.user) {
    user = session.user;
  }
  if (!!user && user.email) {
    email = user.email;
  }

  return (
    <Paper sx={{ width: '20rem' }}>
      <nav aria-label="secondary mailbox folders">
        <div style={{ padding: '2rem 0 2rem 0' }}>
          <Stack spacing={2} justifyContent="center" alignItems="center">
            <Avatar>{email[0].toUpperCase()}</Avatar>
            <Typography>{email}</Typography>
          </Stack>
        </div>
      </nav>
      <Divider />
      <nav aria-label="main mailbox folders">
        <List>
          <ConfirmLogout />
        </List>
      </nav>
    </Paper>
  );
});

const AccountPage = observer(() => {
  return (
    <Stack spacing={2}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        <AccountInfo />
      </div>
      <Divider />
      <div>woo</div>
    </Stack>
  );
});

interface IMenuItem {
  Icon: React.ReactNode;
  title: Page;
  Page: React.ReactNode;
  selected?: boolean;
}

interface IMenuList {
  menuItems: IMenuItem[];
  setActivePage: (name: Page) => void;
}

const MenuList = observer(({ menuItems, setActivePage }: IMenuList) => {
  return (
    <Paper sx={{ height: '100%' }}>
      <Toolbar />
      <Divider />
      <List>
        {menuItems.map(({ Icon, title, selected }) => (
          <ListItemButton
            selected={selected}
            key={title}
            onClick={() => {
              setActivePage(title);
            }}
          >
            <ListItemIcon>{Icon}</ListItemIcon>
            <ListItemText primary={title} />
          </ListItemButton>
        ))}
      </List>
      <Divider />
    </Paper>
  );
});

const PaddedPaper = ({ children }: { children: React.ReactNode }) => {
  return (
    <Paper>
      <Container sx={{ padding: '1rem 0 1rem 0' }}>{children}</Container>
    </Paper>
  );
};

const Settings = observer(() => {
  // const { tabPageStore } = useStore();

  return (
    <div>
      <Stack spacing={4}>
        <div>
          <h4>General</h4>
          <PaddedPaper>
            Toggle app <KeyBindButton id="toggle-app" clickable />
          </PaddedPaper>
        </div>

        <div>
          <h4>Web Page</h4>

          <PaddedPaper>
            <Stack spacing={1}>
              <div id="settings-row">
                Search is always focused when you toggle{' '}
                <KeyBindButton id="toggle-app" /> into an active web page.
              </div>
              <div id="settings-row">
                Toggle floating window{' '}
                <KeyBindButton id="toggle-floating-window" />
              </div>
              <div id="settings-row">
                Focus search box <KeyBindButton id="select-search-box" />
              </div>
              <div id="settings-row">
                Return to tab page when search has focus{' '}
                <KeyBindButton id="hide-from-home" />
              </div>
              <div id="settings-row">
                Return to tab page <KeyBindButton id="home-from-webpage" />{' '}
              </div>
              <div id="settings-row">
                Close web page <KeyBindButton id="close-web-page" />
              </div>
            </Stack>
          </PaddedPaper>
        </div>
        <div>
          <h4>Search</h4>
          <PaddedPaper>
            <Stack spacing={1}>
              <div id="settings-row">
                Clear search: <KeyBindButton id="clear-fuzzy-search" />
              </div>
              <div id="settings-row">
                {' '}
                You can select results in fuzzy search with keyboard.
              </div>
              <div id="settings-row">
                Down <KeyBindButton id="fuzzy-down-arrow" /> or{' '}
                <KeyBindButton id="fuzzy-down" clickable />
              </div>
              <div id="settings-row">
                Up <KeyBindButton id="fuzzy-up-arrow" /> or{' '}
                <KeyBindButton id="fuzzy-up" clickable />
              </div>
              <div id="settings-row">
                Left <KeyBindButton id="fuzzy-left-arrow" /> or{' '}
                <KeyBindButton id="fuzzy-left" clickable />
              </div>
              <div id="settings-row">
                Right <KeyBindButton id="fuzzy-right-arrow" /> or{' '}
                <KeyBindButton id="fuzzy-right" clickable />
              </div>
              <div id="settings-row">
                Open page: <KeyBindButton id="select-fuzzy-result" />
              </div>
            </Stack>
          </PaddedPaper>
        </div>

        <div>
          <h4>Home</h4>
          <PaddedPaper>
            <Stack spacing={1}>
              <div>
                Toggle workspace <KeyBindButton id="toggle-workspace" />
              </div>
              <div id="settings-row">
                Hide <KeyBindButton id="hide-from-home" />
              </div>
            </Stack>
          </PaddedPaper>
        </div>
      </Stack>
    </div>
  );
});

enum Page {
  Account = 'Account',
  KeyBinds = 'Speed Hacks',
  StoryBoard = 'Story Board',
  Feedback = 'Feedback',
}

function getActivePage(activePage: Page, menuItems: IMenuItem[]) {
  let page: React.ReactNode = <div>not found</div>;
  menuItems.forEach((item) => {
    if (activePage === item.title) {
      page = item.Page;
    }
  });
  return page;
}

const SettingsModal = observer(() => {
  const { tabPageStore } = useStore();

  const [activePage, setActivePage] = useState<Page>(Page.Account);

  let menuItems: IMenuItem[] = [
    { Icon: <AccountBox />, title: Page.Account, Page: <AccountPage /> },
    { Icon: <Keyboard />, title: Page.KeyBinds, Page: <Settings /> },
    { Icon: <Dashboard />, title: Page.StoryBoard, Page: <Storyboard /> },
    { Icon: <Comment />, title: Page.Feedback, Page: <div>Feedback</div> },
  ];

  menuItems = menuItems.map((item) => {
    return { ...item, selected: activePage === item.title };
  });

  const setActive = (name: Page) => {
    setActivePage(name);
  };

  const ActivePage = getActivePage(activePage, menuItems);
  return (
    <>
      <GenericModal view={View.Settings}>
        <Grid sx={{ height: '100%' }} container spacing={0}>
          <Grid item xs={3}>
            <MenuList menuItems={menuItems} setActivePage={setActive} />
          </Grid>
          <Grid sx={{ height: '100%', overflowY: 'auto' }} item xs={9}>
            <Container>{ActivePage}</Container>
          </Grid>
        </Grid>
      </GenericModal>

      <RebindModal active={!!tabPageStore.rebindModalId} />
    </>
  );
});

export default SettingsModal;
