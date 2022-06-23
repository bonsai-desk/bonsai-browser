export enum Direction {
  Up,
  Down,
  Left,
  Right,
}

export enum Platform {
  Windows,
  Mac,
}

export const myPlatform =
  navigator.platform.toUpperCase().indexOf('MAC') >= 0
    ? Platform.Mac
    : Platform.Windows;

export const name = 'woo';
