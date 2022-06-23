import path from 'path';
import { app } from 'electron';

const RESOURCES_PATH = app.isPackaged
  ? path.join(process.resourcesPath, 'assets')
  : path.join(__dirname, '../assets');
const getAssetPath = (...paths: string[]): string => {
  return path.join(RESOURCES_PATH, ...paths);
};
export const ICON_PNG = getAssetPath('icon.png');
export const ICON_PNG_2 = getAssetPath('icons/128x128@1x.png');
export const ICON_SMALL_PNG = getAssetPath('/icons/24x24-tray@2x.png');
export default RESOURCES_PATH;
