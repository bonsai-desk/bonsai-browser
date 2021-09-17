import { BrowserView, BrowserWindow } from 'electron';
import { createCipheriv, createDecipheriv } from 'crypto';
import { HistoryEntry } from './interfaces';

export const windowHasView = (
  window: BrowserWindow,
  view: BrowserView
): boolean => {
  const views = window.getBrowserViews();
  for (let i = 0; i < views.length; i += 1) {
    if (views[i] === view) {
      return true;
    }
  }
  return false;
};

export function chord(e: KeyboardEvent): string[] {
  // Ctrl Option Shift Cmd + Key
  // what is e.keyCode good for?

  const modifiers = [
    'ShiftLeft',
    'ControlLeft',
    'MetaLeft',
    'AltLeft',
    'ShiftRight',
    'ControlRight',
    'MetaRight',
    'AltRight',
  ]; // shift, ctrl, meta, alt

  const keys = [];
  if (e.ctrlKey) {
    keys.push('Control');
  }
  if (e.altKey) {
    keys.push('Alt');
  }
  if (e.shiftKey) {
    keys.push('Shift');
  }
  if (e.metaKey) {
    keys.push('Meta');
  }

  if (!modifiers.includes(e.code)) {
    keys.push(e.code);
  }

  return keys;
}

export function validURL(str: string): boolean {
  const pattern = new RegExp(
    '^(https?:\\/\\/)?' + // protocol
      '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
      '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
      '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
      '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
      '(\\#[-a-z\\d_]*)?$',
    'i'
  ); // fragment locator
  return pattern.test(str);
}

export function stringToUrl(url: string): string {
  let fullUrl = url;
  if (!/^https?:\/\//i.test(url)) {
    fullUrl = `http://${url}`;
  }

  // url is invalid
  if (!validURL(fullUrl)) {
    fullUrl = `https://www.google.com/search?q=${url}`;
  }
  return fullUrl;
}

function replacer(_: string, value: any) {
  if (value instanceof Map) {
    return {
      dataType: 'Map',
      value: Array.from(value.entries()),
    };
  }
  return value;
}

function reviver(_: string, value: any) {
  if (typeof value === 'object' && value !== null) {
    if (value.dataType === 'Map') {
      return new Map(value.value);
    }
  }
  return value;
}

export function stringifyMap(map: Map<string, HistoryEntry>): string {
  return JSON.stringify(map, replacer);
}

export function parseMap(jsonString: string): Map<string, HistoryEntry> {
  return JSON.parse(jsonString, reviver);
}

function getDateString(): string {
  const date = new Date();
  return `${date.getMonth()}-${date.getDate()}-${date.getFullYear()}`;
}

export function urlToMapKey(url: string): string {
  return `${getDateString()}_${url}`;
}

export const moveTowards = (
  current: number,
  target: number,
  maxDelta: number
) => {
  if (Math.abs(target - current) <= maxDelta) {
    return target;
  }
  return current + Math.sign(target - current) * maxDelta;
};

/**
 * Returns a number whose value is limited to the given range.
 *
 * Example: limit the output of this computation to between 0 and 255
 * (x * 255).clamp(0, 255)
 *
 * @param {Number} min The lower boundary of the output range
 * @param {Number} max The upper boundary of the output range
 * @returns A number in the range [min, max]
 * @type Number
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function lerp(v0: number, v1: number, t: number): number {
  return v0 * (1 - t) + v1 * t;
}

const key = Buffer.from(new Array(32).fill(0));
const iv = Buffer.from(new Array(16).fill(0));

export function encrypt(text: string) {
  const cipher = createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return encrypted.toString('hex');
}

export function decrypt(text: string) {
  const encryptedText = Buffer.from(text, 'hex');
  const decipher = createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}
