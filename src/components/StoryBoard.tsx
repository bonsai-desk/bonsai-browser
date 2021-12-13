import { observer } from 'mobx-react-lite';
import React from 'react';
import { AddCircle, Settings } from '@material-ui/icons';
import { Divider, Stack, Typography } from '@material-ui/core';
import { Buttons, ButtonRow } from './Buttons';
import { SearchInputParent } from './SearchInput';
import SettingsContainer from './SettingsContainer';

const Storyboard = observer(() => {
  return (
    <SettingsContainer title="Storyboard">
      <Stack spacing={2}>
        <div>
          <h1>Heading h1</h1>
          <h2>Heading h2</h2>
          <h3>Heading h3</h3>
          <h4>Heading h4</h4>
        </div>
        <div>
          <Typography variant="h1">Heading 1</Typography>
          <Typography variant="h2">Heading 2</Typography>
          <Typography variant="h3">Heading 3</Typography>
          <Typography variant="h4">Heading 4</Typography>
          <Typography variant="h5">Heading 5</Typography>
          <Typography variant="h6">Heading 6</Typography>
        </div>
        <Divider />
        <Stack spacing={1}>
          <ButtonRow>
            <Buttons>Button</Buttons>
            <Buttons className="is-active">Button</Buttons>
            <Buttons disabled>Button</Buttons>
          </ButtonRow>
          <ButtonRow>
            <Buttons className="is-primary">Button</Buttons>
            <Buttons className="is-primary is-active">Button</Buttons>
            <Buttons className="is-primary" disabled>
              Button
            </Buttons>
          </ButtonRow>
          <ButtonRow>
            <Buttons className="is-error">Button</Buttons>
            <Buttons className="is-error is-active">Button</Buttons>
            <Buttons className="is-error" disabled>
              Button
            </Buttons>
          </ButtonRow>
          <ButtonRow>
            <Buttons className="is-lowkey">Button</Buttons>
            <Buttons className="is-lowkey is-active">Button</Buttons>
            <Buttons className="is-lowkey" disabled>
              Button
            </Buttons>
          </ButtonRow>
          <ButtonRow>
            <Buttons className="is-active">
              <Settings />
            </Buttons>
            <Buttons className="is-active">
              <AddCircle />
              <div>Some Text</div>
            </Buttons>
          </ButtonRow>
        </Stack>
        <Divider />
        <SearchInputParent placeholder="Search" />
      </Stack>
    </SettingsContainer>
  );
});

export default Storyboard;
