// import React from 'react';
import '@testing-library/jest-dom';
// import { render } from '@testing-library/react';
// import App from '../pages/App';
import {
  color,
  hex2Rgb,
  rgb2Hsl,
  hex2Hsl,
  opacify,
  hslaString,
  varHslaRow,
  themePermute,
} from '../utils/jsutils';

test('convert hex to rgb', () => {
  expect(hex2Rgb('#32a852')).toEqual([50, 168, 82]);
  expect(hex2Rgb('#6e754b')).toEqual([110, 117, 75]);
  expect(hex2Rgb('#000000')).toEqual([0, 0, 0]);
  expect(hex2Rgb('#ffffff')).toEqual([255, 255, 255]);
  expect(hex2Rgb('#26030c')).toEqual([38, 3, 12]);
});

test('convert rbg to hsl', () => {
  expect(rgb2Hsl(0, 0, 0)).toEqual([0, 0, 0]);
  expect(rgb2Hsl(102, 86, 62)).toEqual([36, 24, 32]);
  expect(rgb2Hsl(102, 62, 62)).toEqual([0, 24, 32]);
  expect(rgb2Hsl(150, 150, 150)).toEqual([0, 0, 59]);
  expect(rgb2Hsl(255, 255, 255)).toEqual([0, 0, 100]);
  expect(rgb2Hsl(73, 140, 101)).toEqual([145, 31, 42]);
  expect(rgb2Hsl(74, 161, 152)).toEqual([174, 37, 46]);
  expect(rgb2Hsl(38, 3, 12)).toEqual([345, 85, 8]);
});

test('convert hex to hsl', () => {
  expect(rgb2Hsl(...hex2Rgb('#4aa198'))).toEqual([174, 37, 46]);
  expect(rgb2Hsl(...hex2Rgb('#000000'))).toEqual([0, 0, 0]);
  expect(rgb2Hsl(...hex2Rgb('#ffffff'))).toEqual([0, 0, 100]);
  expect(rgb2Hsl(...hex2Rgb('#a65800'))).toEqual([32, 100, 33]);
  expect(rgb2Hsl(...hex2Rgb('#223b8a'))).toEqual([226, 60, 34]);
  expect(rgb2Hsl(...hex2Rgb('#223b8a'))).toEqual(hex2Hsl('#223b8a'));
});

test('opacify', () => {
  expect(opacify([1, 2, 3], 0.5)).toEqual([1, 2, 3, 0.5]);
  expect(opacify([0, 0, 0], 1.1)).toEqual([0, 0, 0, 1]);
  expect(opacify([0, 0, 0], -9.9)).toEqual([0, 0, 0, 0]);
});

test('generate hsla string', () => {
  expect(hslaString(opacify(hex2Hsl('#3c1652'), 0.5))).toEqual(
    'hsla(278, 58%, 20%, 0.5)'
  );
  expect(hslaString(opacify(hex2Hsl('#26030c'), 0.0))).toEqual(
    'hsla(345, 85%, 8%, 0)'
  );
});

test('color', () => {
  expect(color('link-color')).toEqual('var(--link-color)');
  expect(color('link-color', 0.5)).toEqual('var(--link-color---0.5)');

  expect(varHslaRow('link-color', '#26030c', 'opacity-normal', 0.5)).toEqual(
    '--link-color---opacity-normal: hsla(345, 85%, 8%, 0.5);'
  );

  const THEME_LIGHT = {
    'link-color': '#0075E1',
    'highlight-color': '#F9A132',
  };

  const OPACITIES = {
    'opacity-low': 0.25,
    'opacity-high': 0.75,
  };

  const EXP = `--link-color: hsla(209, 100%, 44%, 1);
--link-color---opacity-low: hsla(209, 100%, 44%, 0.25);
--link-color---opacity-high: hsla(209, 100%, 44%, 0.75);
--highlight-color: hsla(33, 94%, 59%, 1);
--highlight-color---opacity-low: hsla(33, 94%, 59%, 0.25);
--highlight-color---opacity-high: hsla(33, 94%, 59%, 0.75);`;

  expect(themePermute(THEME_LIGHT, OPACITIES)).toEqual(EXP);
});
