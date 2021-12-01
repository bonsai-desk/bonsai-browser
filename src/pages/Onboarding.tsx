/* eslint-disable no-console */
import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { ipcRenderer } from 'electron';
import { User, Session } from '@supabase/gotrue-js';
import {
  useLocation,
  Switch,
  Route,
  MemoryRouter as Router,
  useHistory,
} from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import {
  Box,
  Checkbox,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControlLabel,
  FormHelperText,
  Grid,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@material-ui/core';
import { Visibility, VisibilityOff } from '@material-ui/icons';
import { makeAutoObservable } from 'mobx';
import { observer } from 'mobx-react-lite';
import BonsaiLogoImg from '../../assets/bonsai-logo.svg';
import BonsaiLogoExcitedImg from '../../assets/bonsai-logo-excited.svg';
import BonsaiFocusedImg from '../../assets/bonsai-focused.svg';
import {
  KeyBindBox,
  DynamicKeyBindBox,
  ResetButton,
  ResetButtonIcon,
  Row,
} from '../components/SettingsModal';
import { bindEquals, globalKeybindValid, showKeys } from '../store/keybinds';
import refreshIcon from '../../assets/refresh.svg';
import { chord, validateEmail } from '../utils/utils';
import {
  Button as GrayButton,
  BlueButton,
  InertButtonStyle,
} from '../components/StretchButton';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../constants';
import { Buttons } from '../components/Buttons';
import GlobalStyle from '../GlobalStyle';

const Header = styled.div`
  font-weight: bold;
  font-size: 2rem;
  margin: 5rem 0 1rem 0;
`;

const Slug = styled.div`
  font-weight: bold;
  font-size: 1rem;
  width: 22rem;
  margin: 3rem 0 0 0;
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  position: absolute;
  bottom: 1rem;
  right: 1rem;
`;

const Button = styled.div`
  width: 10rem;
  height: 2rem;
  border-radius: 10px;
  transition-duration: 0.25s;
  background-color: #ff8400;
  filter: brightness(1);
  :hover {
    filter: brightness(0.9);
  }
  display: flex;
  flex-wrap: wrap;
  align-content: center;
  justify-content: center;
  font-weight: bold;
  color: white;
`;

const OnboardingBackground = styled.div`
  user-select: none;
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
`;

const BonsaiLogo = styled.div`
  background-image: url(${BonsaiLogoImg});
  height: 200px;
  background-repeat: no-repeat;
  background-position: center center;
`;

const BonsaiLogoExcited = styled.div`
  background-image: url(${BonsaiLogoExcitedImg});
  height: 200px;
  background-repeat: no-repeat;
  background-position: center center;
`;

const BonsaiLogoFocus = styled.div`
  background-image: url(${BonsaiFocusedImg});
  height: 200px;
  background-repeat: no-repeat;
  background-position: center center;
`;

const BonsaiLogoFocusAlt = styled.div`
  background-image: url(${BonsaiFocusedImg});
  height: 100%;
  width: 100%;
  background-repeat: no-repeat;
  background-position: center center;
`;

const LoginArea = styled.div`
  //background-color: gray;
  //background-color: #21252a;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-content: center;
  height: 100vh;
`;

const ButtonRow = styled.div`
  //background-color: beige;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  margin: 0 0 1rem 0;
`;

const Logo = styled.div`
  ${'' /* font-size: 6rem; */}
  ${'' /* background: blue; */}
  &:before {
    display: inline-block;
    width: 0.7em;
    height: 0.7em;
    content: '';
    background-image: url(https://cloudbrowser.io/bonsai-logo.svg);
    background-repeat: no-repeat;
    background-size: contain;
    background-position: 50% 50%;
    position: relative;
    top: 0.0025em;
    left: -0.1em;
  }
`;

const Center = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-content: center;
  height: 100%;
`;

enum Image {
  Normal,
  Excited,
  Focus,
}

class OnboardingStore {
  user: User | null;

  session: Session | null;

  email: string;

  password: string;

  formError: string;

  toggledOnce = false;

  constructor() {
    makeAutoObservable(this);
    this.user = null;
    this.session = null;
    this.email = '';
    this.password = '';
    this.formError = '';
    ipcRenderer.on('toggled-once', () => {
      this.toggledOnce = true;
    });
  }

  setUser(msg: User) {
    this.user = msg;
  }

  setSession(msg: Session) {
    this.session = msg;
  }

  setFormError(msg: string) {
    this.formError = msg;
  }

  setEmail(msg: string) {
    this.email = msg;
  }

  setPassword(msg: string) {
    this.password = msg;
  }
}

const onboardingStore = new OnboardingStore();

interface IOnboardingPage {
  logo: Image;
  PageText: React.ReactNode;
  PageButton: React.ReactNode | undefined;
}

const OnboardingPage = ({ logo, PageButton, PageText }: IOnboardingPage) => {
  return (
    <OnboardingBackground>
      <div>
        <Header>Bonsai</Header>
        <BonsaiLogo
          style={{ display: logo === Image.Normal ? 'block' : 'none' }}
        />
        <BonsaiLogoExcited
          style={{ display: logo === Image.Excited ? 'block' : 'none' }}
        />
        <BonsaiLogoFocus
          style={{ display: logo === Image.Focus ? 'block' : 'none' }}
        />
        <Slug>{PageText}</Slug>
      </div>
      {PageButton}
    </OnboardingBackground>
  );
};

const buttonEnabledStyle = { opacity: '100%' };
const buttonDisabledStyle = { opacity: '0%' };

interface IInfoPage {
  PageInfo: React.ReactNode;
  nextPage: string | undefined;
  logo: Image;
}

const InfoPage = ({ PageInfo, nextPage, logo }: IInfoPage) => {
  const [buttonEnabled, setButtonEnabled] = useState(false);
  const history = useHistory();
  useEffect(() => {
    setButtonEnabled(false);
    setTimeout(() => {
      setButtonEnabled(true);
    }, 1000);
  }, []);

  const PageButton = (
    <ButtonContainer>
      <Button
        style={buttonEnabled ? buttonEnabledStyle : buttonDisabledStyle}
        onClick={() => {
          history.push(nextPage || '/');
        }}
      >
        Next
      </Button>
    </ButtonContainer>
  );
  return (
    <OnboardingPage
      logo={logo}
      PageText={PageInfo}
      PageButton={nextPage ? PageButton : undefined}
    />
  );
};

const IsADashboard = () => {
  const PageText = (
    <div style={{ textAlign: 'end', width: '100%' }}>
      Is a dashboard web browser
    </div>
  );
  return (
    <InfoPage
      logo={Image.Normal}
      PageInfo={PageText}
      nextPage="you-can-toggle"
    />
  );
};

const YouCanTogglePage = () => {
  const PageText = (
    <div key="even-fullscreen" style={{ width: '100%', textAlign: 'end' }}>
      <div>You can bring it up anywhere</div>
      <div style={{}}>even in fullscreen</div>
    </div>
  );

  return (
    <InfoPage logo={Image.Excited} PageInfo={PageText} nextPage="toggle" />
  );
};

const TogglePage = () => {
  const defaultBind = ['Alt', 'Space'];
  const [bind, setBind] = useState<string[]>(defaultBind);
  const [rebind, setRebind] = useState(false);
  const [newBind, setNewBind] = useState<string[]>(defaultBind);

  const bindIsDefault = bindEquals(bind, defaultBind);

  const keysValid = globalKeybindValid(newBind);

  useEffect(() => {
    ipcRenderer.send('viewed-toggle-page');
  }, []);

  useEffect(() => {
    if (rebind) {
      // ipcRenderer.send('log-data', 'disable');
      ipcRenderer.send('disable-hotkeys');
    }
    return () => {
      // ipcRenderer.send('log-data', 'enable');
      ipcRenderer.send('enable-hotkeys');
    };
  }, [rebind]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (rebind) {
        e.preventDefault();
        setNewBind(chord(e));
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [rebind]);

  useEffect(() => {
    ipcRenderer.send('rebind-hotkey', {
      hotkeyId: 'toggle-app',
      newBind: bind,
    });
  }, [bind]);

  if (rebind) {
    return (
      <OnboardingBackground>
        <div>
          <Header>Rebind Toggle App</Header>
          <Row
            style={{
              justifyContent: 'center',
              width: '30rem',
            }}
          >
            <KeyBindBox
              style={{
                margin: '4rem 0 0 0',
              }}
            >
              {showKeys(newBind)}

              <ResetButton style={{ opacity: bindIsDefault ? '20%' : '100%' }}>
                <ResetButtonIcon
                  onClick={() => {
                    setNewBind(defaultBind);
                  }}
                  src={refreshIcon}
                />
              </ResetButton>
            </KeyBindBox>
          </Row>

          <Row style={{ margin: '5rem 0 0 0', justifyContent: 'flex-end' }}>
            <GrayButton
              id="button"
              onClick={() => {
                setRebind(false);
              }}
            >
              Cancel
            </GrayButton>
            <BlueButton
              style={keysValid ? {} : InertButtonStyle}
              onClick={() => {
                if (keysValid) {
                  setRebind(false);
                  setBind(newBind);
                }
              }}
              id="button"
            >
              Ok
            </BlueButton>
          </Row>
        </div>
      </OnboardingBackground>
    );
  }

  const PageInfo = (
    <div key={3}>
      <div
        style={{ margin: '-2rem 0 0 0', width: '100%', textAlign: 'center' }}
      >
        Toggle now with{' '}
      </div>
      <Row style={{ margin: '1rem 0 0 0', justifyContent: 'center' }}>
        <DynamicKeyBindBox
          style={{}}
          onClick={() => {
            setRebind(true);
            setNewBind(bind);
          }}
        >
          {showKeys(bind)}
        </DynamicKeyBindBox>
      </Row>
    </div>
  );

  return (
    <InfoPage PageInfo={PageInfo} nextPage={undefined} logo={Image.Focus} />
  );
};

const NotFound = () => {
  const history = useHistory();
  const loc = useLocation();
  return (
    <div>
      {JSON.stringify(loc)}
      <div>
        <Buttons
          className="is-primary"
          onClick={() => {
            history.push('create-account');
          }}
        >
          Go back
        </Buttons>
      </div>
    </div>
  );
};

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface ILoadyButton {
  children: React.ReactNode | string;
  className?: string;
  loading?: boolean;
  onClick?: () => void;
}

const LoadyButton = ({
  children,
  className = '',
  loading = false,
  onClick = () => {},
}: ILoadyButton) => {
  return (
    <div style={{ position: 'relative' }}>
      <Buttons
        className={className || 'is-primary'}
        disabled={loading}
        onClick={() => {
          if (!loading) {
            onClick();
          }
        }}
      >
        {children}
      </Buttons>
      {loading && (
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
    </div>
  );
};

const CreateAccountPage = () => {
  // const passwordTextRef = useRef<HTMLInputElement>(null);
  // const emailTextRef = useRef<HTMLInputElement>(null);
  const [values, setValues] = React.useState({
    loading: false,
    email: '',
    emailError: '',
    password: '',
    showPassword: false,
    loginDisabled: true,
  });

  const [formError, setFormError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const history = useHistory();

  const handleClickShowPassword = () => {
    setValues({
      ...values,
      showPassword: !values.showPassword,
    });
  };

  // todo this is janky
  useEffect(() => {
    if (submitted) {
      setTimeout(() => {
        setValues({ ...values, loginDisabled: false });
      }, 4000);
    }
  }, [submitted, values]);

  async function clickLogin() {
    if (!values.loginDisabled) {
      // setValues({ ...values, loading: true });
      onboardingStore.setEmail(values.email);
      onboardingStore.setPassword(values.password);
      try {
        const { user, session, error } = await supabase.auth.signIn({
          email: values.email,
          password: values.password,
        });
        if (error) {
          const msg = error.message;
          // setFormError(msg);
          onboardingStore.setFormError(msg);
          history.push('/login');
        } else {
          console.log(user, session);
          // ipcRenderer.send('sign-in-user', user);
          ipcRenderer.send('sign-in-session', session);
          if (user) {
            onboardingStore.setUser(user);
          }
          if (session) {
            onboardingStore.setSession(session);
          }
          history.push('/is-a-dashboard');
        }
      } catch (error) {
        // setValues({ ...values, loading: false });
        const u = error as { error_description: string; message: string };
        const msg = u.error_description || u.message;
        onboardingStore.setFormError(msg);
        history.push('/login');
        // setFormError(msg);
        // alert(error.error_description || error.message);
      } finally {
        // setValues({ ...values, loading: false });
      }
      // todo
    }
  }

  if (submitted) {
    return (
      <LoginArea>
        <Stack spacing={2}>
          <Typography variant="h4" component="div" gutterBottom>
            Check your email to verify your account
          </Typography>
          <Typography variant="h6" component="div" gutterBottom>
            {values.email}
          </Typography>
          <ButtonRow>
            <Buttons
              onClick={() => {
                setSubmitted(false);
                setValues({
                  ...values,
                  email: '',
                  password: '',
                  emailError: '',
                  loading: false,
                  showPassword: false,
                });
              }}
              className="is-primary-lowkey"
            >
              Back
            </Buttons>
            <Buttons
              className="is-primary"
              disabled={values.loginDisabled}
              onClick={() => {
                clickLogin();
              }}
            >
              Login
            </Buttons>
          </ButtonRow>
        </Stack>
      </LoginArea>
    );
  }

  // useEffect(() => {}, []);

  const handleLogin = async () => {
    try {
      setValues({ ...values, loading: true });
      const { user, session, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
      });
      console.log(user, session, error);
      if (error) {
        setFormError(error.message);
      } else {
        setSubmitted(true);
      }
    } catch (error) {
      setValues({ ...values, loading: false });

      const u = error as { error_description: string; message: string };
      const msg = u.error_description || u.message;
      setFormError(msg);
      // alert(error.error_description || error.message);
    } finally {
      setValues({ ...values, loading: false });
      // setValues({ ...values, loading: false, formError: 'wwwwww' });
    }
  };

  // Login {values.loading ? 'loading' : 'done loading'}

  const submit = () => {
    handleLogin();
  };
  return (
    <LoginArea>
      <Container>
        <Grid container spacing={2}>
          <Grid sx={{ height: '100vh', background: 'transparent' }} item xs={6}>
            <Center>
              <Box
                component="form"
                sx={{
                  width: 400,
                }}
                noValidate
                autoComplete="off"
                onSubmit={(e: React.FormEvent) => {
                  e.preventDefault();
                }}
                onKeyDown={(e: React.KeyboardEvent<HTMLFormElement>) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                  }
                }}
              >
                <Stack spacing={2}>
                  <Typography variant="h5" component="div" gutterBottom>
                    Create an account
                  </Typography>
                  {formError.length > 0 ? (
                    <FormHelperText error>{formError}</FormHelperText>
                  ) : (
                    ''
                  )}

                  <TextField
                    value={values.email}
                    fullWidth
                    error={values.emailError.length > 0}
                    helperText={values.emailError}
                    label="Email"
                    onChange={(e) => {
                      setValues({
                        ...values,
                        email: e.target.value,
                        emailError: '',
                      });
                    }}
                    onBlur={() => {
                      if (!validateEmail(values.email)) {
                        setValues({
                          ...values,
                          emailError: 'Invalid email format',
                        });
                      } else {
                        setValues({ ...values, emailError: '' });
                      }
                    }}
                  />
                  <TextField
                    value={values.password}
                    fullWidth
                    label="Password"
                    variant="outlined"
                    type={values.showPassword ? 'text' : 'password'}
                    onChange={(e) => {
                      setValues({ ...values, password: e.target.value });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        submit();
                      }
                    }}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label="toggle password visibility"
                            onClick={handleClickShowPassword}
                            // onMouseDown={handleMouseDownPassword}
                            edge="end"
                          >
                            {values.showPassword ? (
                              <VisibilityOff />
                            ) : (
                              <Visibility />
                            )}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                  <FormControlLabel
                    value="end"
                    control={<Checkbox />}
                    label="Subscribe to updates about Bonsai Browser."
                    labelPlacement="end"
                  />
                  <ButtonRow>
                    <Buttons
                      className="is-primary-lowkey"
                      onClick={(e) => {
                        e.preventDefault();
                        history.push('login');
                      }}
                    >
                      Sign in instead
                    </Buttons>
                    <LoadyButton
                      onClick={() => {
                        submit();
                      }}
                      loading={values.loading}
                    >
                      Continue
                    </LoadyButton>
                  </ButtonRow>
                </Stack>
              </Box>
            </Center>
          </Grid>
          <Grid sx={{ background: 'transparent' }} item xs={6}>
            <Center>
              <div style={{ height: '100%', width: '90%' }}>
                <BonsaiLogoFocusAlt />
              </div>
            </Center>
          </Grid>
        </Grid>
      </Container>
    </LoginArea>
  );
};

const LogoSquare = styled.div`
  background-image: url(https://cloudbrowser.io/bonsai-logo.svg);
  background-repeat: no-repeat;
  background-size: contain;
  width: 100%;
  height: 100%;
`;

const LoginPage = observer(() => {
  const [values, setValues] = React.useState({
    loading: false,
    // email: '',
    emailError: '',
    // password: '',
    showPassword: false,
  });

  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetComplete, setResetComplete] = useState(false);
  const [resetError, setResetError] = useState('');
  const handleClose = () => {
    setResetOpen(false);
  };

  const handleResetPassword = () => {
    if (!validateEmail(resetEmail)) {
      setResetError('Please enter a valid email');
      return;
    }
    supabase.auth.api
      .resetPasswordForEmail(resetEmail)
      .then(({ data, error }) => {
        console.log(data, error);
        if (error) {
          setResetError(error.message);
        } else {
          setResetComplete(true);
        }
        return 0;
      })
      .catch(console.log);
  };

  useEffect(() => {
    return () => {
      onboardingStore.setFormError('');
    };
  }, []);

  const history = useHistory();

  // const [formError, setFormError] = useState('');
  const handleClickShowPassword = () => {
    setValues({
      ...values,
      showPassword: !values.showPassword,
    });
  };

  async function submit() {
    setValues({ ...values, loading: true });
    onboardingStore.setFormError('');
    try {
      const { user, session, error } = await supabase.auth.signIn({
        email: onboardingStore.email,
        password: onboardingStore.password,
      });
      if (error) {
        setValues({ ...values, loading: false });
        const msg = error.message;
        onboardingStore.setFormError(msg);
      } else {
        console.log(user, session);
        // ipcRenderer.send('sign-in-user', user);
        ipcRenderer.send('sign-in-session', session);
        const route = onboardingStore.toggledOnce ? 'toggle' : 'is-a-dashboard';
        history.push(route);
      }
    } catch (error: unknown) {
      setValues({ ...values, loading: false });
      const u = error as { error_description: string; message: string };
      const msg = u.error_description || u.message || ' ';
      onboardingStore.setFormError(msg);
      // alert(error.error_description || error.message);
    } finally {
      setValues({ ...values, loading: false });
    }
  }

  return (
    <LoginArea>
      <Box
        component="form"
        sx={{
          width: 400,
        }}
        noValidate
        autoComplete="off"
        onSubmit={(e: React.FormEvent) => {
          e.preventDefault();
        }}
        onKeyDown={(e: React.KeyboardEvent<HTMLFormElement>) => {
          if (e.key === 'Enter') {
            e.preventDefault();
          }
        }}
      >
        <Stack spacing={2}>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ width: '100%', position: 'relative' }}>
              <Typography variant="h5" component="div" gutterBottom>
                Sign in
              </Typography>
              <Typography
                variant="h6"
                component="div"
                color="text.secondary"
                gutterBottom
              >
                Welcome back!
              </Typography>
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  height: '4rem',
                  width: '4rem',
                }}
              >
                <LogoSquare />
              </div>
            </div>
          </div>
          {onboardingStore.formError.length > 0 ? (
            <FormHelperText error>{onboardingStore.formError}</FormHelperText>
          ) : (
            ''
          )}
          <TextField
            value={onboardingStore.email}
            fullWidth
            error={values.emailError.length > 0}
            helperText={values.emailError}
            label="Email"
            onChange={(e) => {
              onboardingStore.setEmail(e.target.value);
              setValues({
                ...values,
                emailError: '',
              });
            }}
            onBlur={() => {
              if (!validateEmail(onboardingStore.email)) {
                setValues({
                  ...values,
                  emailError: 'Invalid email format',
                });
              } else {
                setValues({ ...values, emailError: '' });
              }
            }}
          />
          <TextField
            value={onboardingStore.password}
            fullWidth
            label="Password"
            variant="outlined"
            type={values.showPassword ? 'text' : 'password'}
            onChange={(e) => {
              onboardingStore.setPassword(e.target.value);
              // setValues({ ...values, password: e.target.value });
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                submit();
              }
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={handleClickShowPassword}
                    // onMouseDown={handleMouseDownPassword}
                    edge="end"
                  >
                    {values.showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <ButtonRow>
            <Buttons
              className="is-primary-lowkey"
              onClick={() => {
                history.push('create-account');
              }}
            >
              Create account
            </Buttons>
            <LoadyButton
              loading={values.loading}
              onClick={() => {
                submit();
              }}
            >
              Continue
            </LoadyButton>
          </ButtonRow>
          <Divider />
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            <Buttons
              className=""
              onClick={() => {
                if (validateEmail(onboardingStore.email)) {
                  setResetEmail(onboardingStore.email);
                } else {
                  setResetEmail('');
                }
                setResetOpen(true);
              }}
            >
              Forgot Password?
            </Buttons>
            <Dialog
              open={resetOpen}
              onClose={handleClose}
              aria-labelledby="alert-dialog-title"
              aria-describedby="alert-dialog-description"
              fullWidth
            >
              {resetComplete ? (
                <>
                  <DialogTitle id="alert-dialog-title">
                    Reset Email Sent!
                  </DialogTitle>
                  <DialogContent dividers>
                    <DialogContentText>Check {resetEmail}</DialogContentText>
                  </DialogContent>
                  <DialogActions>
                    <Buttons
                      className="is-primary"
                      onClick={() => {
                        setResetOpen(false);
                        setResetComplete(false);
                        setResetEmail('');
                      }}
                    >
                      Done
                    </Buttons>
                  </DialogActions>
                </>
              ) : (
                <>
                  <DialogTitle id="alert-dialog-title">
                    Reset Password?
                  </DialogTitle>
                  <DialogContent dividers>
                    {resetError ? (
                      <FormHelperText sx={{ padding: '0 0 1rem 0' }} error>
                        {resetError}
                      </FormHelperText>
                    ) : (
                      ''
                    )}
                    <TextField
                      value={resetEmail}
                      fullWidth
                      label="Email"
                      variant="outlined"
                      onChange={(e) => {
                        setResetEmail(e.target.value);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleResetPassword();
                        }
                      }}
                    />
                  </DialogContent>
                  <DialogActions>
                    <Buttons
                      className="is-primary-lowkey"
                      onClick={handleClose}
                    >
                      Cancel
                    </Buttons>
                    <Buttons
                      className="is-primary"
                      onClick={handleResetPassword}
                      autoFocus
                    >
                      Reset
                    </Buttons>
                  </DialogActions>
                </>
              )}
            </Dialog>
          </div>
        </Stack>
      </Box>
    </LoginArea>
  );
});

const Root = () => {
  const [view, setView] = useState(false);
  const history = useHistory();
  useEffect(() => {
    ipcRenderer.on('history-push', (_, page) => {
      history.push(page);
    });
    setTimeout(() => {
      setView(true);
    }, 250);
  }, [history]);
  if (view) {
    return <NotFound />;
  }
  return <div />;
};

const HeaderParent = styled.div`
  position: absolute;
  top: 0;
  width: 100%;
`;

const HeaderInner = styled.div`
  padding: 0.5rem 0 0.5rem 0;
  ${'' /* background: blue; */}
`;

const HeaderText = styled(Typography)`
  ${'' /* background: blue; */}
  ${'' /* font-size: 6rem; */}
  ${'' /* background: blue; */}
  &:before {
    display: inline-block;
    width: 0.7em;
    height: 0.7em;
    content: '';
    background-image: url(https://cloudbrowser.io/bonsai-logo.svg);
    background-repeat: no-repeat;
    background-size: contain;
    background-position: 50% 50%;
    position: relative;
    top: 0.0025em;
    left: -0.1em;
  }
`;

const LogoHeader = () => {
  return (
    <HeaderParent>
      <Container>
        <HeaderInner>
          <HeaderText variant="h2">bonsai</HeaderText>
        </HeaderInner>
        <Divider />
      </Container>
    </HeaderParent>
  );
};

const Onboarding = () => {
  return (
    <Router>
      <GlobalStyle />
      <Switch>
        <Route exact path="/" component={Root} />
        <Route exact path="/create-account" component={CreateAccountPage} />
        <Route exact path="/login" component={LoginPage} />
        <Route exact path="/is-a-dashboard" component={IsADashboard} />
        <Route exact path="/you-can-toggle" component={YouCanTogglePage} />
        <Route exact path="/toggle" component={TogglePage} />
        <Route component={NotFound} />
      </Switch>
    </Router>
  );
};

export default Onboarding;
