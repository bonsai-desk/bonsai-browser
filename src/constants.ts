import { app } from 'electron';
import path from 'path';

const RESOURCES_PATH = app.isPackaged
  ? path.join(process.resourcesPath, 'assets')
  : path.join(__dirname, '../assets');

const getAssetPath = (...paths: string[]): string => {
  return path.join(RESOURCES_PATH, ...paths);
};

export const VIBRANCY = 'fullscreen-ui';

export const URL_PEEK_HTML = `file://${__dirname}/url-peek.html`;

export const INDEX_HTML = `file://${__dirname}/index.html`;

export const FIND_HTML = `file://${__dirname}/find.html`;

export const OVERLAY_HTML = `file://${__dirname}/overlay.html`;

export const TAB_PAGE = `file://${__dirname}/tab-page.html`;

export const ICON_PNG = getAssetPath('icon.png');

export const ICON_SMALL_PNG = getAssetPath('/icons/24x24-tray@2x.png');

export const PRELOAD = `${__dirname}/utils/preload.js`;

export default RESOURCES_PATH;
