import { observer } from 'mobx-react-lite';
import TimeAgo from 'javascript-time-ago';
import en from 'javascript-time-ago/locale/en.json';
import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { runInAction } from 'mobx';
import { ipcRenderer } from 'electron';
import * as crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  AccountBox,
  Backup,
  CloudDownload,
  Comment,
  Dashboard,
  Delete,
  ExitToApp,
  Info,
  Keyboard,
} from '@material-ui/icons';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Fab,
  Grid,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Modal,
  Paper,
  Stack,
  Tooltip,
} from '@material-ui/core';
import {
  Typography,
  TextField,
  ToggleButtonGroup,
  ToggleButton,
  InputAdornment,
  Switch,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
  Slider,
} from '@mui/material';
import {
  BrowserUpdated,
  FiberManualRecord,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import GenericModal from './GenericModal';
import { useStore } from '../store/tab-page-store';
import MiniGenericModal from './MiniGenericModal';
import '../index.css';
import {
  BlueButton,
  Button as BonsaiButton,
  ButtonBase,
  InertButtonStyle,
} from './StretchButton';
import refreshIcon from '../../assets/refresh.svg';
import {
  bindEquals,
  globalKeybindValid,
  searchEngines,
  showKeys,
} from '../store/keybinds';
import Storyboard from './StoryBoard';
import HeaderText from './HeaderText';
import SettingsContainer from './SettingsContainer';
import { color } from '../utils/jsutils';
import pkg from '../package.json';
import { USE_ACCOUNT, View } from '../constants';
import {
  exportWatermelon,
  importWatermelon,
  WatermelonDBData,
} from '../watermelon/databaseUtils';

const { version } = pkg;

TimeAgo.addDefaultLocale(en);
const timeAgo = new TimeAgo('en-US');

interface ISnapshot {
  id: number;
  data: any;
  inserted_at: string;
  user_id: string;
}

const RebindTitle = styled.div`
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

export const CenterModalBox = ({ children }: { children: React.ReactNode }) => {
  return (
    <Box
      sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        minWidth: 275,
      }}
    >
      {children}
    </Box>
  );
};

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
          <RebindTitle>Shortcut: {bind ? bind.name : '?'}</RebindTitle>
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

  return (
    <Button
      sx={{
        '&:disabled': { color: 'var(--body-text-color)' },
      }}
      variant="contained"
      disabled={!clickable}
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
    </Button>
  );
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

function hashNumber(num: number): string {
  return crypto
    .createHash('sha1')
    .update(num.toString())
    .digest('hex')
    .slice(0, 4);
}

interface IAccountPageValues {
  snapshots: ISnapshot[];
  loading: boolean;
  error: string;
}

const CreateNewBackupCard = observer(
  ({
    handleClose,
    handleCreate,
  }: {
    handleCreate: (snapshot: ISnapshot) => void;
    handleClose: () => void;
  }) => {
    const { tabPageStore, database, workspaceStore } = useStore();
    const [values, setValues] = useState<{
      loading: boolean;
      snapshot?: ISnapshot;
    }>({
      loading: false,
      snapshot: undefined,
    });
    const myId = tabPageStore.session?.user?.id;
    if (!tabPageStore.supaClient) {
      return null;
    }
    async function submit() {
      if (!tabPageStore.supaClient) {
        return;
      }
      const snapshotData = await exportWatermelon(database);
      fs.writeFileSync(
        path.join(workspaceStore.dataPath, 'data-export'),
        JSON.stringify(snapshotData, null, '  ')
      );
      setValues({ ...values, loading: true });
      // eslint-disable-next-line promise/catch-or-return
      tabPageStore.supaClient
        .from('tagssnapshot')
        .insert([{ data: snapshotData, user_id: myId }])
        .then(({ data, error }) => {
          if (error) {
            console.log(error);
          } else if (data) {
            const row = data[0];
            handleCreate(row);
            setValues({ ...values, loading: false, snapshot: row });
          } else {
            console.log('fail');
          }
          return 0;
        });
    }
    return (
      <Card>
        {values.loading ? <LinearProgress /> : ''}
        <CardContent>
          <Typography gutterBottom variant="h5" component="div">
            Create New Backup?
          </Typography>

          <Stack spacing={1}>
            {values.snapshot ? (
              <Alert>Backup ({hashNumber(values.snapshot.id)}) Created!</Alert>
            ) : (
              ''
            )}
            <Alert severity="info">
              You can use your backups on other devices!
            </Alert>
          </Stack>
        </CardContent>
        <CardActions>
          <Button
            size="small"
            onClick={() => {
              handleClose();
            }}
          >
            {values.snapshot ? 'Done' : 'Cancel'}
          </Button>
          {values.snapshot ? (
            ''
          ) : (
            <Button
              onClick={() => {
                submit();
              }}
              disabled={values.loading}
              color="primary"
              size="small"
            >
              Upload
            </Button>
          )}
        </CardActions>
      </Card>
    );
  }
);

const DeleteSnapshotCard = observer(
  ({
    handleClose,
    snapshot,
    deleteCallback,
  }: {
    handleClose: () => void;
    snapshot: ISnapshot;
    deleteCallback: (id: number) => void;
  }) => {
    const { tabPageStore } = useStore();
    if (!tabPageStore.supaClient) {
      return null;
    }
    const title = hashNumber(snapshot.id);
    const [values, setValues] = useState({ loading: false, error: '' });
    const submit = () => {
      if (!tabPageStore.supaClient) {
        return;
      }
      // eslint-disable-next-line promise/catch-or-return
      tabPageStore.supaClient
        .from('tagssnapshot')
        .delete()
        .eq('id', snapshot.id)
        // eslint-disable-next-line promise/always-return
        .then(({ error }) => {
          // console.log(error, data);
          if (error) {
            setValues({ ...values, error: error.message });
          } else {
            deleteCallback(snapshot.id);
            handleClose();
          }
          return 0;
        });
    };
    return (
      <Card>
        {values.loading ? <LinearProgress /> : ''}
        <CardContent>
          <Typography gutterBottom variant="h5" component="div">
            Delete Backup ({title})?
          </Typography>
          {values.error ? <Alert severity="error">{values.error}</Alert> : ''}
          <Alert severity="warning">This can not be reversed!</Alert>
        </CardContent>
        <CardActions>
          <Button
            size="small"
            onClick={() => {
              handleClose();
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              submit();
            }}
            disabled={values.loading}
            color="error"
            size="small"
          >
            Delete
          </Button>
        </CardActions>
      </Card>
    );
  }
);

const ApplyBackupCard = observer(
  ({
    snapshot,
    handleClose,
  }: {
    snapshot: ISnapshot;
    handleClose: () => void;
  }) => {
    const title = hashNumber(snapshot.id);
    const [values, setValues] = useState({ loading: false, done: false });
    const { tabPageStore, database } = useStore();
    if (!tabPageStore.supaClient) {
      return null;
    }
    async function submit() {
      if (!tabPageStore.supaClient) {
        return;
      }
      setValues({ ...values, loading: true });
      const { data, error } = await tabPageStore.supaClient
        .from('tagssnapshot')
        .select('data')
        .eq('id', snapshot.id);
      if (error) {
        setValues({ ...values, loading: false });
      } else if (data && data[0]) {
        // applySnapshot(workspaceStore, data[0].data);
        const dbData: WatermelonDBData = JSON.parse(data[0].data);
        if (dbData) {
          importWatermelon(database, dbData);
        }
        setValues({ ...values, loading: false, done: true });
      }
    }
    return (
      <Card>
        {values.loading ? <LinearProgress /> : ''}
        <CardContent>
          <Typography gutterBottom variant="h5" component="div">
            Apply Backup ({title})?
          </Typography>
          <Stack spacing={1}>
            {values.done ? (
              <Alert severity="success">Backup Applied.</Alert>
            ) : (
              ''
            )}
            <Alert severity="warning">
              This will overwrite your current tag data.
            </Alert>
          </Stack>
        </CardContent>
        <CardActions>
          <Button
            size="small"
            onClick={() => {
              handleClose();
            }}
          >
            {values.done ? 'Done' : 'Cancel'}
          </Button>
          {!values.done ? (
            <Button
              disabled={values.loading}
              onClick={() => {
                submit();
              }}
              color="primary"
              size="small"
            >
              Apply
            </Button>
          ) : (
            ''
          )}
        </CardActions>
      </Card>
    );
  }
);

const WorkspaceSnapshot = ({
  data,
  deleteCallback,
}: {
  deleteCallback: (id: number) => void;
  data: ISnapshot;
}) => {
  const [values, setValues] = useState({
    deleteOpen: false,
    downloadOpen: false,
  });

  const [timeAgoStr, setTimeAgoStr] = useState('');

  const title = hashNumber(data.id);

  function setTime() {
    const date = Date.parse(data.inserted_at);
    const timeStr = timeAgo.format(date);
    if (typeof timeStr === 'string') {
      setTimeAgoStr(timeStr);
    }
  }

  useEffect(() => {
    const handle = setInterval(() => {
      setTime();
    }, 5000);
    setTime();
    return () => {
      clearInterval(handle);
    };
  });

  return (
    <Paper>
      <div
        style={{
          padding: '1rem',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
        }}
      >
        <span>
          <Typography color={color('header-text-color')} variant="h6">
            Backup ({title})
          </Typography>
          <Typography
            variant="body1"
            color={color('body-text-color', 'opacity-high')}
          >
            {timeAgoStr}
          </Typography>
        </span>
        <Stack alignItems="center" direction="row" spacing={1}>
          <div>
            <Tooltip title="Apply Backup">
              <IconButton
                onClick={() => {
                  setValues({ ...values, downloadOpen: true });
                }}
              >
                <CloudDownload />
              </IconButton>
            </Tooltip>
          </div>
          <div>
            <Tooltip title="Delete">
              <IconButton
                onClick={() => {
                  setValues({ ...values, deleteOpen: true });
                }}
              >
                <Delete />
              </IconButton>
            </Tooltip>
          </div>
        </Stack>
      </div>
      <Modal
        open={values.downloadOpen}
        onClose={() => {
          setValues({ ...values, downloadOpen: false });
        }}
      >
        <Box>
          <CenterModalBox>
            <ApplyBackupCard
              snapshot={data}
              handleClose={() => {
                setValues({ ...values, downloadOpen: false });
              }}
            />
          </CenterModalBox>
        </Box>
      </Modal>
      <Modal
        open={values.deleteOpen}
        onClose={() => {
          setValues({ ...values, deleteOpen: false });
        }}
      >
        <Box>
          <CenterModalBox>
            <DeleteSnapshotCard
              snapshot={data}
              deleteCallback={deleteCallback}
              handleClose={() => {
                setValues({ ...values, deleteOpen: false });
              }}
            />
          </CenterModalBox>
        </Box>
      </Modal>
    </Paper>
  );
};

const PaddedPaper = ({ children }: { children: React.ReactNode }) => {
  return (
    <Paper>
      <Container sx={{ padding: '1rem 0 1rem 0' }}>{children}</Container>
    </Paper>
  );
};

function updateStateToString(status: string) {
  switch (status) {
    case 'checking':
      return 'checking for updates';
    case 'update-available':
      return 'downloading...';
    case 'update-not-available':
      return 'you are on the latest version';
    case 'error':
      return 'error checking for update. try again';
    default:
      break;
  }
  return 'unknown';
}

function CircularProgressWithLabel({ value }: { value: number }) {
  return (
    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
      <CircularProgress variant="determinate" value={value} />
      <Box
        sx={{
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
          position: 'absolute',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography
          variant="caption"
          component="div"
          color="text.secondary"
        >{`${Math.round(value)}%`}</Typography>
      </Box>
    </Box>
  );
}

const UpdatesPage = observer(() => {
  const { tabPageStore } = useStore();

  let lastChecked = 'Never';
  if (tabPageStore.lastUpdateCheckTime) {
    const timeStr = timeAgo.format(tabPageStore.lastUpdateCheckTime);
    if (typeof timeStr === 'string') {
      lastChecked = timeStr;
    }
  }

  const checking = tabPageStore.updateState === 'checking';
  const percent = tabPageStore.updateDownloaded
    ? 100
    : tabPageStore.updateDownloadProgressPercent;

  const status = (
    <>
      <Typography variant="h6">Status</Typography>
      <div>
        {tabPageStore.updateDownloaded
          ? 'Downloaded'
          : updateStateToString(tabPageStore.updateState)}
      </div>
      <div>
        {tabPageStore.updateState === 'update-available' ||
        tabPageStore.updateDownloaded ? (
          <CircularProgressWithLabel value={percent} />
        ) : null}
      </div>
    </>
  );

  const info = tabPageStore.updateState === 'idle' ? null : status;

  const content = (
    <>
      <Box sx={{ m: 1, position: 'relative' }}>
        <Button
          variant="contained"
          disabled={checking}
          onClick={() => {
            ipcRenderer.send('check-for-updates');
          }}
        >
          Check for Updates
          {checking && (
            <CircularProgress
              size={24}
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                marginTop: '-12px',
                marginLeft: '-12px',
              }}
            />
          )}
        </Button>
      </Box>
      <Typography variant="caption">{`Last Check: ${lastChecked}`}</Typography>
      <div>{info}</div>
    </>
  );

  return (
    <SettingsContainer title="Update">
      <Stack spacing={4}>
        <div>
          <PaddedPaper>
            <Stack spacing={2}>
              {!tabPageStore.updateDownloaded ? (
                content
              ) : (
                <>
                  <Typography variant="h6">Update Ready</Typography>
                  <div>
                    <Button
                      onClick={() => {
                        ipcRenderer.send('update-and-restart');
                      }}
                    >
                      Install and Restart
                    </Button>
                  </div>
                </>
              )}
            </Stack>
          </PaddedPaper>
        </div>
      </Stack>
    </SettingsContainer>
  );
});

const AccountPage = observer(() => {
  const [values, setValues] = useState<IAccountPageValues>({
    snapshots: [],
    loading: true,
    error: '',
  });
  const [createOpen, setCreateOpen] = useState(false);
  const { tabPageStore } = useStore();

  if (!tabPageStore.supaClient) {
    return null;
  }

  const myId = tabPageStore.session?.user?.id;

  const fetchSnapshots = () => {
    if (!tabPageStore.supaClient) {
      return;
    }
    if (!myId) {
      console.log('No user id');
    } else {
      // interface ISnapshot {
      //   id: number;
      //   data: any;
      //   inserted_at: string;
      //   user_id: string;
      // }

      // eslint-disable-next-line promise/catch-or-return
      tabPageStore.supaClient
        .from('tagssnapshot')
        .select('id, inserted_at, user_id')
        .eq('user_id', myId)
        .order('inserted_at', { ascending: false })
        .then(({ error, data }) => {
          // eslint-disable-next-line promise/always-return
          if (error) {
            console.log(error);
            setValues({ ...values, loading: false, error: error.message });
          } else if (data) {
            setValues({
              ...values,
              loading: false,
              snapshots: data,
              error: '',
            });
          }
        });
    }
  };

  const handleCreate = (snapshot: ISnapshot) => {
    console.log('snapshot created', snapshot);
    fetchSnapshots();
  };

  // todo figure out how to do this better
  useEffect(() => {
    setValues({ ...values, loading: true });
    const handle = setInterval(() => {
      fetchSnapshots();
    }, 3000);
    fetchSnapshots();
    return () => {
      clearInterval(handle);
    };
  }, []);

  const deleteCallback = (snapshotId: number) => {
    const newSnapshots = values.snapshots.filter(
      (snapshot) => snapshot.id !== snapshotId
    );
    setValues({ ...values, snapshots: newSnapshots });
  };

  return (
    <SettingsContainer title="Account & Backup">
      <Stack spacing={4}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            padding: '2rem 0 2rem 0',
          }}
        >
          <AccountInfo />
        </div>
        <Divider />
        <Stack spacing={4}>
          <Grid container direction="row" justifyContent="space-between">
            <Typography variant="h6">Cloud Tag Backups</Typography>
            <Stack direction="row" spacing={2}>
              <div>
                <Fab
                  color="primary"
                  variant="extended"
                  onClick={() => {
                    setCreateOpen(true);
                  }}
                >
                  <Backup sx={{ mr: 1 }} />
                  Backup Current Data
                </Fab>
              </div>
            </Stack>
          </Grid>
          {values.error ? <Alert severity="error">{values.error}</Alert> : ''}
          {values.loading ? (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
              }}
            >
              <CircularProgress />
            </div>
          ) : (
            <Stack spacing={1}>
              {values.snapshots.length > 0 ? (
                values.snapshots.map((snapshot) => {
                  return (
                    <WorkspaceSnapshot
                      deleteCallback={deleteCallback}
                      key={snapshot.id}
                      data={snapshot}
                    />
                  );
                })
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                  }}
                >
                  <Chip icon={<Info />} label="No Backups Found" />
                </div>
              )}
            </Stack>
          )}
        </Stack>
      </Stack>
      <Modal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
        }}
      >
        <Box>
          <CenterModalBox>
            <CreateNewBackupCard
              handleClose={() => {
                setCreateOpen(false);
              }}
              handleCreate={handleCreate}
            />
          </CenterModalBox>
        </Box>
      </Modal>
    </SettingsContainer>
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

enum Page {
  Update = 'Update',
  Account = 'Account',
  Shortcuts = 'Shortcuts',
  StoryBoard = 'Story Board',
  Feedback = 'Feedback',
  SettingsItem = 'Settings',
}

const MenuList = observer(({ menuItems, setActivePage }: IMenuList) => {
  const { tabPageStore } = useStore();

  return (
    <Paper sx={{ height: '100%' }}>
      <List>
        <ListItem>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              width: '100%',
            }}
          >
            <HeaderText variant="h3">bonsai</HeaderText>
          </div>
        </ListItem>
        <Divider component="li" />
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
            {title === Page[Page.Update] && tabPageStore.updateDownloaded ? (
              <FiberManualRecord color="error" />
            ) : null}
          </ListItemButton>
        ))}
      </List>
      <Divider />
    </Paper>
  );
});

const Settings = observer(() => {
  // const { tabPageStore } = useStore();

  const Title = ({ children }: { children: React.ReactNode }) => {
    return (
      <Typography gutterBottom variant="h6">
        {children}
      </Typography>
    );
  };

  return (
    <SettingsContainer title="Shortcuts">
      <Stack spacing={4}>
        <div>
          <Title>General</Title>
          <PaddedPaper>
            <Stack spacing={1}>
              <div id="settings-row">
                Toggle app <KeyBindButton id="toggle-app" clickable />
              </div>
              <div id="settings-row">
                Tile window left <KeyBindButton id="snap-left" /> or{' '}
                <KeyBindButton id="snap-left-normal" />
              </div>
              <div id="settings-row">
                Tile window right <KeyBindButton id="snap-right" /> or{' '}
                <KeyBindButton id="snap-right-normal" />
              </div>
              <div id="settings-row">
                Maximize tiled window <KeyBindButton id="fullscreen" /> or{' '}
                <KeyBindButton id="fullscreen-normal" />
              </div>
            </Stack>
          </PaddedPaper>
        </div>

        <div>
          <Title>Web Page</Title>

          <PaddedPaper>
            <Stack spacing={1}>
              <div id="settings-row">
                Search is always focused when you toggle{' '}
                <KeyBindButton id="toggle-app" /> into an active web page.
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
          <Title>Lists</Title>
          <PaddedPaper>
            <Stack spacing={1}>
              <div id="settings-row">
                {' '}
                You can select results using the keyboard
              </div>
              <div id="settings-row">
                {'Down '}
                <KeyBindButton id="raw-down" />
                {', '}
                <KeyBindButton id="fuzzy-down" />
                {', or '}
                <KeyBindButton id="fuzzy-down-arrow" />
              </div>
              <div id="settings-row">
                {'Up '}
                <KeyBindButton id="raw-up" />
                {', '}
                <KeyBindButton id="fuzzy-up" />
                {', or '}
                <KeyBindButton id="fuzzy-up-arrow" />
              </div>
              <div id="settings-row">
                Open page: <KeyBindButton id="select-fuzzy-result" />
              </div>
              <div id="settings-row">
                Clear search: <KeyBindButton id="clear-fuzzy-search" />
              </div>
            </Stack>
          </PaddedPaper>
        </div>

        <div>
          <Title>Home</Title>
          <PaddedPaper>
            <Stack spacing={1}>
              <div>
                Toggle tabs layout <KeyBindButton id="toggle-workspace" />
              </div>
              <div id="settings-row">
                Hide <KeyBindButton id="hide-from-home" />
              </div>
            </Stack>
          </PaddedPaper>
        </div>
      </Stack>
    </SettingsContainer>
  );
});

function getActivePage(activePage: Page, menuItems: IMenuItem[]) {
  let page: React.ReactNode = <div>not found</div>;
  menuItems.forEach((item) => {
    if (activePage === item.title) {
      page = item.Page;
    }
  });
  return page;
}

const FeedbackPage = observer(() => {
  const { tabPageStore } = useStore();
  if (!tabPageStore.supaClient) {
    return null;
  }
  const [values, setValues] = useState({
    loading: false,
    feedback: '',
    done: false,
    error: '',
  });
  const myId = tabPageStore.session?.user?.id;
  const email = tabPageStore.session?.user?.email || 'email@address.com';
  async function submit() {
    if (!tabPageStore.supaClient) {
      return;
    }
    setValues({ ...values, loading: true, error: '' });
    if (myId) {
      const { error } = await tabPageStore.supaClient
        .from('feedback')
        .insert([{ data: values.feedback, user_id: myId, email, version }]);
      if (error) {
        setValues({
          ...values,
          error: error.message,
        });
      } else {
        setValues({ ...values, loading: false, done: true });
      }
    }
  }
  return (
    <SettingsContainer title="Feedback">
      <Stack spacing={2}>
        <div>
          <Card>
            <CardContent>
              <Stack
                direction="row"
                spacing={2}
                justifyContent="center"
                alignItems="center"
              >
                <Avatar>{email[0].toUpperCase()}</Avatar>
                <div>
                  <Typography color={color('header-text-color')} variant="h6">
                    {email}
                  </Typography>
                  <Typography
                    variant="body1"
                    color={color('body-text-color', 'opacity-high')}
                  >
                    v{version}
                  </Typography>
                </div>
              </Stack>
            </CardContent>
          </Card>
        </div>
        {values.error ? <Alert severity="error">{values.error}</Alert> : ''}
        <Card>
          {values.loading ? <LinearProgress /> : ''}
          <CardContent>
            {!values.done ? (
              <div>
                <Typography
                  gutterBottom
                  color={color('body-text-color', 'opacity-high')}
                >
                  All thoughts are appreciated 😊
                </Typography>
                <TextField
                  value={values.feedback}
                  onChange={(e) => {
                    setValues({ ...values, feedback: e.target.value });
                  }}
                  fullWidth
                  multiline
                  rows={4}
                />
              </div>
            ) : (
              <div>
                <Alert severity="success">Feedback sent!</Alert>
              </div>
            )}
          </CardContent>
          <CardActions>
            {!values.done ? (
              <Button
                disabled={values.loading || !values.feedback}
                onClick={() => {
                  submit();
                }}
              >
                Send Feedback
              </Button>
            ) : (
              <Button
                onClick={() => {
                  setValues({
                    ...values,
                    loading: false,
                    done: false,
                    feedback: '',
                  });
                }}
              >
                Done
              </Button>
            )}
          </CardActions>
        </Card>
      </Stack>
    </SettingsContainer>
  );
});

const ConfigPage = observer(() => {
  const { keybindStore, tabPageStore } = useStore();
  const { theme } = keybindStore.settings;

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    let search: 'Google' | 'DuckDuckGo' | 'Andi' = 'Google';
    if (
      event.target.value === 'Google' ||
      event.target.value === 'DuckDuckGo' ||
      event.target.value === 'Andi'
    ) {
      search = event.target.value;
    }
    keybindStore.setSearch(search);
  };

  return (
    <SettingsContainer title="Settings">
      <Stack spacing={4}>
        <div>
          <Typography variant="h6" gutterBottom>
            Theme
          </Typography>
          <PaddedPaper>
            <Stack spacing={2}>
              <div>
                <ToggleButtonGroup
                  // value={alignment}
                  exclusive
                  // onChange={handleAlignment}
                  aria-label="text alignment"
                >
                  <ToggleButton
                    selected={theme === 'system'}
                    onClick={() => {
                      keybindStore.setTheme('system');
                    }}
                    value="left"
                    aria-label="left aligned"
                  >
                    System
                  </ToggleButton>
                  <ToggleButton
                    onClick={() => {
                      keybindStore.setTheme('dark');
                    }}
                    selected={theme === 'dark'}
                    value="center"
                    aria-label="centered"
                  >
                    Dark
                  </ToggleButton>
                  <ToggleButton
                    onClick={() => {
                      keybindStore.setTheme('light');
                    }}
                    selected={theme === 'light'}
                    value="right"
                    aria-label="right aligned"
                  >
                    Light
                  </ToggleButton>
                </ToggleButtonGroup>
              </div>
              <div>
                <Typography
                  gutterBottom
                  variant="h6"
                  color="var(--header-text-color)"
                >
                  Custom Background
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Switch
                    checked={keybindStore.settings.backgroundEnabled}
                    onChange={() => {
                      keybindStore.setBackgroundEnabled(
                        !keybindStore.settings.backgroundEnabled
                      );
                    }}
                  />
                  <TextField
                    disabled={!keybindStore.settings.backgroundEnabled}
                    value={keybindStore.settings.background}
                    onChange={(e) => {
                      keybindStore.setBackground(e.target.value);
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">#</InputAdornment>
                      ),
                    }}
                  />
                </Stack>
              </div>
            </Stack>
          </PaddedPaper>
        </div>
        <div>
          <Typography variant="h6" gutterBottom>
            Search Engine
          </Typography>
          <PaddedPaper>
            <FormControl component="fieldset">
              <RadioGroup
                aria-label="gender"
                name="controlled-radio-buttons-group"
                value={keybindStore.settings.selectedSearch}
                onChange={handleChange}
              >
                {Array.from(Object.keys(searchEngines)).map((key) => {
                  return (
                    <FormControlLabel
                      key={key}
                      value={key}
                      control={<Radio />}
                      label={key}
                    />
                  );
                })}
              </RadioGroup>
            </FormControl>
          </PaddedPaper>
        </div>
        <div>
          <Typography variant="h6" gutterBottom>
            Tiling Floating Window Width
          </Typography>
          <PaddedPaper>
            <div>% of screen width (with minimum width of 580 pixels)</div>
            <Slider
              value={tabPageStore.tilingWidthSliderValue}
              min={10}
              max={90}
              valueLabelDisplay="auto"
              onChange={(_, value: number | number[]) => {
                const v = value as number;
                if (tabPageStore.tilingWidthSliderValue !== v) {
                  runInAction(() => {
                    tabPageStore.tilingWidthSliderValue = v;
                  });
                }
              }}
              onChangeCommitted={() => {
                ipcRenderer.send(
                  'change-tiling-width',
                  tabPageStore.tilingWidthSliderValue
                );
              }}
              onKeyDown={(e) => {
                e.preventDefault();
              }}
            />
            <Button
              onClick={() => {
                runInAction(() => {
                  tabPageStore.tilingWidthSliderValue = 45;
                });
                ipcRenderer.send(
                  'change-tiling-width',
                  tabPageStore.tilingWidthSliderValue
                );
              }}
            >
              Reset to Default Value
            </Button>
          </PaddedPaper>
        </div>
        <div>
          <Typography variant="h6" gutterBottom>
            Auto Focus Search
          </Typography>
          <PaddedPaper>
            <div>
              should the search box auto focus when you toggle the app if you
              are on a web page?
            </div>
            <ToggleButtonGroup
              value={tabPageStore.shouldNotFocusBonsaiBox ? 'no' : 'yes'}
              exclusive
              onChange={(_, newAlignment: string | null) => {
                if (!newAlignment) {
                  return;
                }

                if (newAlignment === 'yes') {
                  tabPageStore.setShouldNotFocusBonsaiBox(false);
                } else {
                  tabPageStore.setShouldNotFocusBonsaiBox(true);
                }
              }}
              aria-label="text alignment"
            >
              <ToggleButton value="yes" aria-label="left aligned">
                Yes
              </ToggleButton>
              <ToggleButton value="no" aria-label="centered">
                No
              </ToggleButton>
            </ToggleButtonGroup>
          </PaddedPaper>
        </div>
      </Stack>
    </SettingsContainer>
  );
});

const SettingsModalContent = observer(() => {
  const { tabPageStore } = useStore();

  let defaultActivePage = tabPageStore.updateDownloaded
    ? Page.Update
    : Page.Account;

  if (!USE_ACCOUNT) {
    defaultActivePage = Page.SettingsItem;
  }

  const [activePage, setActivePage] = useState<Page>(defaultActivePage);

  let menuItems: IMenuItem[] = [
    { Icon: <SettingsIcon />, title: Page.SettingsItem, Page: <ConfigPage /> },
    { Icon: <Keyboard />, title: Page.Shortcuts, Page: <Settings /> },
  ];

  if (USE_ACCOUNT) {
    menuItems.unshift(
      {
        Icon: <AccountBox />,
        title: Page.Account,
        Page: <AccountPage />,
      },
      {
        Icon: <BrowserUpdated />,
        title: Page.Update,
        Page: <UpdatesPage />,
      }
    );

    menuItems.push({
      Icon: <Comment />,
      title: Page.Feedback,
      Page: <FeedbackPage />,
    });
  }

  if (process.env.NODE_ENV === 'development') {
    menuItems.push({
      Icon: <Dashboard />,
      title: Page.StoryBoard,
      Page: <Storyboard />,
    });
  }

  menuItems = menuItems.map((item) => {
    return { ...item, selected: activePage === item.title };
  });

  const setActive = (name: Page) => {
    setActivePage(name);
  };

  const ActivePage = getActivePage(activePage, menuItems);

  return (
    <Grid
      sx={{
        width: `${Math.min(tabPageStore.windowSize.width - 50, 1000)}px`,
        height: '100%',
      }}
      container
      spacing={0}
    >
      <Grid item xs={3}>
        <MenuList menuItems={menuItems} setActivePage={setActive} />
      </Grid>
      <Grid sx={{ height: '100%', overflowY: 'auto' }} item xs={9}>
        <Container>{ActivePage}</Container>
      </Grid>
    </Grid>
  );
});

const SettingsModal = observer(() => {
  const { tabPageStore } = useStore();
  return (
    <>
      <GenericModal view={View.Settings}>
        <SettingsModalContent />
      </GenericModal>

      <RebindModal active={!!tabPageStore.rebindModalId} />
    </>
  );
});

export default SettingsModal;
