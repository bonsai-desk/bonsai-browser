import { createGlobalStyle } from 'styled-components';
import { color, themePermute } from './utils/jsutils';

const THEME_LIGHT = {
  'canvas-color': '#ffffff',
  'canvas-border-color': '#dee1e6',
  'canvas-inactive-color': '#d9dde2',
  'canvas-inactive-hover': '#f1f2f4',
  'search-color': '#edeff0',
  'tab-divider-color': '#808387',
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

const THEME_DARK = {
  'canvas-color': '#2f2f33',
  'canvas-border-color': '#555659',
  'canvas-inactive-color': '#1d1e20',
  'canvas-inactive-hover': '#28292c',
  'search-color': '#1d1e20',
  'tab-divider-color': '#535458',
  'link-color': '#2399E7',
  'highlight-color': '#FBBE63',
  'text-highlight-color': '#FBBE63',
  'warning-color': '#DE3C21',
  'confirmation-color': '#189E36',
  'header-text-color': '#BABABA',
  'body-text-color': '#AAAAAA',
  'border-color': 'hsla(32, 81%, 90%, 0.08)',
  'background-minus-1': '#151515',
  'background-minus-2': '#111111',
  'background-color': '#1A1A1A',
  'background-plus-1': '#222222',
  'background-plus-2': '#333333',
  'graph-control-bg': '#272727',
  'graph-control-color': 'white',
  'graph-node-normal': '#909090',
  'graph-node-hlt': '#FBBE63',
  'graph-link-normal': '#323232',
  'error-color': '#fd5243',
};

const OPACITIES = {
  'opacity-lower': 0.1,
  'opacity-low': 0.25,
  'opacity-med': 0.5,
  'opacity-high': 0.75,
  'opacity-higher': 0.85,
};

const head = `
  html,
  body {
    line-height: 1.5;
    color: ${color('body-text-color')};
    font-size: 16px;
  }
`;

const GlobalStyle = createGlobalStyle`
  ${head}
  @media (prefers-color-scheme: dark) {
    :root {
      ${themePermute(THEME_DARK, OPACITIES)}
    }
  }
  @media (prefers-color-scheme: light) {
    :root {
      ${themePermute(THEME_LIGHT, OPACITIES)}
    }
  }
`;

export const GlobalDark = createGlobalStyle`
  ${head}
  :root {
    ${themePermute(THEME_DARK, OPACITIES)}
  }
`;

export const GlobalLight = createGlobalStyle`
  ${head}
  :root {
    ${themePermute(THEME_LIGHT, OPACITIES)}
  }
`;

export default GlobalStyle;
