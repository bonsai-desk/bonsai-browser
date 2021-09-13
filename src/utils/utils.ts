import { BrowserView, BrowserWindow } from 'electron';
import { createCipheriv, createDecipheriv } from 'crypto';
import { isUri } from 'valid-url';
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

export function stringToUrl(url: string): string {
  if (url.indexOf('.') !== -1) {
    if (isUri(url)) {
      return url;
    }

    const urlWithHttp = `http://${url}`;
    if (isUri(urlWithHttp)) {
      return urlWithHttp;
    }
  }

  // url is invalid
  return `https://www.google.com/search?q=${encodeURIComponent(url)}`;
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
