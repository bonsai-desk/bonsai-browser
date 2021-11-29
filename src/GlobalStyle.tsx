import { createGlobalStyle } from 'styled-components';
import { color, themePermute } from './utils/jsutils';

const THEME_LIGHT = {
  'link-color': '#0075E1',
  'highlight-color': '#F9A132',
  'text-highlight-color': '#ffdb8a',
  'warning-color': '#D20000',
  'confirmation-color': '#009E23',
  'header-text-color': '#322F38',
  'body-text-color': '#433F38',
  'border-color': 'hsla(32, 81%, 10%, 0.08)',
  'background-plus-2': '#ffffff',
  'background-plus-1': '#fbfbfb',
  'background-color': '#F6F6F6',
  'background-minus-1': '#FAF8F6',
  'background-minus-2': '#EFEDEB',
  'graph-control-bg': '#f9f9f9',
  'graph-control-color': 'black',
  'graph-node-normal': '#909090',
  'graph-node-hlt': '#0075E1',
  'graph-link-normal': '#cfcfcf',
  'error-color': '#fd5243',
};
const OPACITIES = {
  'opacity-lower': 0.1,
  'opacity-low': 0.25,
  'opacity-med': 0.5,
  'opacity-high': 0.75,
  'opacity-higher': 0.85,
};
const GlobalStyle = createGlobalStyle`
  html,
  body {
    line-height: 1.5;
    color: ${color('body-text-color')};
    font-size: 16px;
  }

  :root {
    ${themePermute(THEME_LIGHT, OPACITIES)}
  }
`;

export default GlobalStyle;
