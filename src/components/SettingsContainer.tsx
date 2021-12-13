import React from 'react';
import { Typography } from '@material-ui/core';

const SettingsContainer = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => {
  return (
    <div style={{ padding: '1rem 0 1rem 0' }}>
      <Typography gutterBottom variant="h4">
        {title}
      </Typography>
      {children}
    </div>
  );
};

export default SettingsContainer;
