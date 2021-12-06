/* eslint-disable */

// yoinked from https://github.com/takanopontaro/node-parse-hosts/blob/master/lib/main.js

import { ipcRenderer } from 'electron';

const _ = require('lodash');

const fs = require('fs');

export function get(path) {
  let buf, line, md, obj, _i, _len, _ref;
  if (path == null) {
    path = (function () {
      switch (process.platform) {
        case 'win32':
          return 'C:/Windows/System32/drivers/etc/hosts';
        default:
          return '/etc/hosts';
      }
    })();
  }
  buf = '' + fs.readFileSync(path);
  obj = {};
  _ref = buf.replace(/#.*/g, '').split(/[\r\n]/);
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    line = _ref[_i];
    md = /(\d+\.\d+\.\d+\.\d+)\s+(.+)/.exec(line);
    if (md) {
      obj[md[1]] = _.union(obj[md[1]] || [], md[2].trim().split(/\s+/));
    }
  }
  return obj;
}

export function hex2Rgb(color) {
  var R = parseInt(color.substring(1, 3), 16);
  var G = parseInt(color.substring(3, 5), 16);
  var B = parseInt(color.substring(5, 7), 16);
  R = R < 255 ? R : 255;
  G = G < 255 ? G : 255;
  B = B < 255 ? B : 255;
  return [R, G, B];
}

function trimOne(x) {
  return x > 1 ? 1 : x;
}

export function rgb2Hsl(r, g, b) {
  // base function
  // https://github.com/noprompt/garden/blob/master/src/garden/color.cljc
  // segment hue shift
  // https://stackoverflow.com/questions/39118528/rgb-to-hsl-conversion
  (r /= 255), (g /= 255), (b /= 255);
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const d = mx - mn;
  let h, s, l;
  if (mx === mn) {
    h = 0;
  } else if (mx === r) {
    const segment = (g - b) / d;
    let shift = 0;
    if (segment < 0) {
      shift = 360;
    }
    h = 60 * (segment + shift);
  } else if (mx === g) {
    h = 120 + 60 * ((b - r) / d);
  } else if (mx === b) {
    h = 240 + 60 * ((r - g) / d);
  }

  l = trimOne((mx + mn) / 2);

  let sPrime;
  if (mx === mn) {
    sPrime = 0;
  } else if (l < 0.5) {
    sPrime = d / (2 * l);
  } else {
    sPrime = d / (2 - 2 * l);
  }
  s = trimOne(sPrime);

  return [Math.round(h) % 360, Math.round(100 * s), Math.round(100 * l)];
}

export function hex2Hsl(color) {
  return rgb2Hsl(...hex2Rgb(color));
}

export function opacify(hsl, opacity) {
  const out = [...hsl];
  out.push(Math.max(0, trimOne(opacity)));
  return out;
}

export function hslaString(hsla) {
  // hsla(235 100% 50% 1);
  const [h, s, l, a] = hsla;
  return `hsla(${h}, ${s}%, ${l}%, ${a})`;
}

const THEME_LIGHT = {
  'link-color': '#0075E1',
  'highlight-color': '#F9A132',
  'text-highlight-color': '#ffdb8a',
  'warning-color': '#D20000',
  'confirmation-color': '#009E23',
  'header-text-color': '#322F38',
  'body-text-color': '#433F38',
  'border-color': 'hsla(32, 81%, 10%, 0.08)',
  'background-plus-2': '#fff',
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

export function varHslaRow(name, hex, alphaName, alpha) {
  return `--${name}---${alphaName}: ${hslaString(
    opacify(hex2Hsl(hex), alpha)
  )};`;
}

export function themePermute(theme, opacities) {
  return Object.entries(theme)
    .map(([name, hex]) => {
      const out = [`--${name}: ${hslaString(opacify(hex2Hsl(hex), 1.0))};`];
      Object.entries(opacities).forEach(([alphaName, alpha]) => {
        out.push(varHslaRow(name, hex, alphaName, alpha));
      });
      return out.join('\n');
    })
    .join('\n');
}

export function color(variable, alpha) {
  if (!alpha) {
    return `var(--${variable})`;
  }
  return `var(--${variable}---${alpha})`;
}

export function mixpanelTrack(eventName, properties = {}) {
  ipcRenderer.send('mixpanel-track-prop', { eventName, properties });
}
