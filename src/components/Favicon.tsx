// noinspection CssInvalidPropertyValue
import styled from 'styled-components';
import { Public } from '@material-ui/icons';
import React from 'react';

const FaviconParent = styled.div`
  position: relative;
  height: 16px;
  background-size: cover;
  background-repeat: no-repeat;
  background-position: center center;
  mask-size: cover;
  mask-repeat: no-repeat;
  mask-position: center center;
  //noinspection CssInvalidPropertyValue
  image-rendering: -webkit-optimize-contrast;
`;
const FavImage = styled.div`
  position: relative;
  height: 16px;

  svg {
    position: absolute;
    top: -4px;
    left: 0;
    color: var(--body-text-color);
    width: 100%;
  }
`;

interface IFavicon {
  favicon: string;
  width?: number;
}

const Favicon = ({ favicon, width = 16 }: IFavicon) => {
  if (favicon) {
    return (
      <FaviconParent
        style={{
          width: `${width}px`,
          backgroundImage: `url(${favicon})`,
        }}
      />
    );
  }
  return (
    <FavImage
      style={{
        width: `${width}px`,
      }}
    >
      <Public />
    </FavImage>
  );
};

export default Favicon;
