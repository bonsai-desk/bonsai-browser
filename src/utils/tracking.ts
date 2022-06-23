import { ipcRenderer } from 'electron';

export type Location =
  | 'home (recent)'
  | 'home (domains)'
  | 'search page'
  | 'tag page'
  | 'all tags page';
type Item = 'saved page' | 'active tab' | 'tag';

export function trackClosePage(
  trigger: 'mouse' | 'hotkey',
  type: Item,
  location: Location
) {
  ipcRenderer.send('mixpanel-track-with-props', [
    'close page item',
    { trigger, location, type },
  ]);
}

export function trackCloseGroup(
  trigger: 'mouse' | 'hotkey',
  location: Location,
  type: Item
) {
  ipcRenderer.send('mixpanel-track-with-props', [
    'close page group',
    { trigger, location, type },
  ]);
}

export function trackOpenItem(
  trigger: 'mouse' | 'hotkey',
  type: Item,
  location?: Location,
  info?: string
) {
  const data: Record<string, any> =
    typeof location !== 'undefined'
      ? { trigger, location, type }
      : { trigger, type };
  if (typeof info !== 'undefined') {
    data.info = info;
  }
  ipcRenderer.send('mixpanel-track-with-props', ['open page item', data]);
}
