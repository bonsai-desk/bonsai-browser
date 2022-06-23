import styled from 'styled-components';
import { Typography } from '@material-ui/core';
import { color } from '../utils/jsutils';

const HeaderText = styled(Typography)`
  ${'' /* background: blue; */}
  ${'' /* font-size: 6rem; */}
  ${'' /* background: blue; */}
    color: ${color('header-text-color')};
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

export default HeaderText;
