import { applySnapshot, getSnapshot, Instance, types } from 'mobx-state-tree';
import { ipcRenderer } from 'electron';
import path from 'path';
import fs from 'fs';
import { chord, tryDecrypt, encrypt } from '../utils/utils';
import { myPlatform, Platform } from '../render-constants';

const GOOG_STRING = 'https://www.google.com/search?q=%s';
const DUCK_STRING = 'https://duckduckgo.com/?q=%s';

function loadJSON(store: Instance<any>, encrypted = true): any {
  if (store.userDataPath !== '') {
    try {
      const snapshotPath = path.join(store.userDataPath, 'keybindSnapshot');
      const json = fs.readFileSync(snapshotPath, 'utf8');
      if (json !== '') {
        return JSON.parse(encrypted ? tryDecrypt(json) : json);
      }
      return undefined;
    } catch (err) {
      console.log('err load snap');
      console.log(err);
      //
      return undefined;
    }
  }
  return undefined;
}

// function loadSnapshot(store: Instance<any>, encrypted = true): any {
//   if (store.userDataPath !== '') {
//     try {
//       const snapshotPath = path.join(store.userDataPath, 'keybindSnapshot');
//       const json = fs.readFileSync(snapshotPath, 'utf8');
//       if (json !== '') {
//         const storeSnapshot = JSON.parse(encrypted ? tryDecrypt(json) : json);
//         try {
//           applySnapshot(store, storeSnapshot);
//         } catch (err) {
//           ipcRenderer.send('log-data', JSON.stringify(err));
//           console.log('err load snap');
//           console.log(err);
//         }
//         return storeSnapshot;
//       }
//     } catch (err) {
//       ipcRenderer.send('log-data', JSON.stringify(err));
//       console.log('err load snap');
//       console.log(err);
//       //
//     }
//   }
//   return {};
// }

function saveSnapshot(store: Instance<any>, encrypted = true) {
  if (store.userDataPath !== '') {
    try {
      const snapshotPath = path.join(store.userDataPath, 'keybindSnapshot');
      const snapshot = getSnapshot(store);
      const snapshotString = JSON.stringify(snapshot, null, '  ');
      fs.writeFileSync(
        snapshotPath,
        encrypted ? encrypt(snapshotString) : snapshotString
      );
    } catch {
      //
    }
  }
}

export function bindEquals(a: string[], b: string[]) {
  const lenMatch = a.length === b.length;
  let charMatch = true;
  a.forEach((code, i) => {
    charMatch = charMatch && code === b[i];
  });
  return charMatch && lenMatch;
}

const keyMap: Record<string, string | Record<string, string>> = {
  Control: 'Ctrl',
  CmdOrCtrl: { Win: 'Ctrl', Mac: '⌘' },
  Meta: { Win: 'Win', Mac: '⌘' },
  Alt: { Win: 'Alt', Mac: '⌥' },
  Backslash: '\\',
  ArrowLeft: '←',
  ArrowRight: '→',
  ArrowUp: '↑',
  ArrowDown: '↓',
  KeyA: 'A',
  KeyB: 'B',
  KeyC: 'C',
  KeyD: 'D',
  KeyE: 'E',
  KeyF: 'F',
  KeyG: 'G',
  KeyH: 'H',
  KeyI: 'I',
  KeyJ: 'J',
  KeyK: 'K',
  KeyL: 'L',
  KeyM: 'M',
  KeyN: 'N',
  KeyO: 'O',
  KeyP: 'P',
  KeyQ: 'Q',
  KeyR: 'R',
  KeyS: 'S',
  KeyT: 'T',
  KeyU: 'U',
  KeyV: 'V',
  KeyW: 'W',
  KeyX: 'X',
  KeyY: 'Y',
  KeyZ: 'Z',
};

function showKey(key: string): string {
  const data = keyMap[key];
  if (data) {
    if (typeof data === 'string') {
      return data;
    }
    if (myPlatform === Platform.Mac) {
      return data.Mac;
    }
    return data.Win;
  }
  return key;
}

export function showKeys(keys: string[]): string {
  const out = keys.map(showKey);
  return out.join(' ');
}

export interface IKeyBind {
  name: string;
  defaultBind: string[];
  currentBind: string[];
  version: number;
}

const KeyBind = types
  .model({
    name: types.string,
    defaultBind: types.array(types.string),
    currentBind: types.array(types.string),
    version: types.number,
  })
  .actions((self) => ({
    setCurrentBind(newBind: string[]) {
      self.currentBind.replace(newBind);
    },
    reset() {
      self.currentBind.replace(self.defaultBind);
    },
  }))
  .views((self) => ({
    showCode(): string {
      return showKeys(self.currentBind);
    },
    is(otherBind: string[]): boolean {
      const lenMatch = otherBind.length === self.currentBind.length;
      let charMatch = true;
      otherBind.forEach((code, i) => {
        charMatch = charMatch && code === self.currentBind[i];
      });
      return charMatch && lenMatch;
    },
  }));

const Settings = types.model({
  theme: types.enumeration('theme', ['system', 'dark', 'light']),
  backgroundEnabled: types.boolean,
  background: types.string,
  search: types.map(types.string),
  selectedSearch: types.enumeration('search', ['Google', 'DuckDuckGo']),
});

export const KeybindStore = types
  .model({ binds: types.map(KeyBind), settings: Settings })
  .volatile(() => ({
    userDataPath: '',
  }))
  .actions((self) => ({
    setSearch(search: 'Google' | 'DuckDuckGo') {
      self.settings.selectedSearch = search;
      saveSnapshot(self, false);
    },
    setTheme(theme: 'system' | 'dark' | 'light') {
      self.settings.theme = theme;
      saveSnapshot(self, false);
    },
    setBackgroundEnabled(enabled: boolean) {
      self.settings.backgroundEnabled = enabled;
      saveSnapshot(self, false);
    },
    setBackground(background: string) {
      self.settings.background = background;
      saveSnapshot(self, false);
    },
    addBind(id: string, data: IKeyBind) {
      self.binds.set(id, data);
      saveSnapshot(self, false);
    },
    setBind(id: string, newBind: string[]) {
      const bind = self.binds.get(id);
      if (bind) {
        bind.setCurrentBind(newBind);
        saveSnapshot(self, false);
      }
    },
    setUserDataPath(userDataPath: string) {
      self.userDataPath = userDataPath;
    },
    saveSnapshot() {
      saveSnapshot(self, false);
    },
  }))
  .views((self) => ({
    searchString(): string {
      return (
        self.settings.search.get(self.settings.selectedSearch) || GOOG_STRING
      );
    },
    isBind(e: KeyboardEvent, bind: string): boolean {
      // ipcRenderer.send('log-data', { bind });
      // ipcRenderer.send('log-data', getSnapshot(self.binds));
      const internalChord = self.binds.get(bind);
      // ipcRenderer.send('log-data', getSnapshot(internalChord));
      if (internalChord) {
        // ipcRenderer.send('log-data', {
        //   cho: chord(e),
        //   inch: [...internalChord.currentBind],
        //   match: bindEquals(chord(e), internalChord.currentBind),
        // });
        return bindEquals(chord(e), internalChord.currentBind);
      }
      return false;
    },
  }));

export function defaultKeybindStore(): Instance<typeof KeybindStore> {
  return KeybindStore.create({
    settings: {
      theme: 'system',
      background: 'fcba03',
      backgroundEnabled: false,
      selectedSearch: 'Google',
      search: {
        Google: GOOG_STRING,
        DuckDuckGo: DUCK_STRING,
      },
    },
    binds: {
      'toggle-floating-window': {
        version: 4,
        name: 'Toggle Floating Window',
        defaultBind: ['CmdOrCtrl', 'Backslash'],
        currentBind: ['CmdOrCtrl', 'Backslash'],
      },
      'toggle-app': {
        version: 1,
        name: 'Toggle App',
        defaultBind: ['Alt', 'Space'],
        currentBind: ['Alt', 'Space'],
      },
      'fuzzy-left': {
        version: 2,
        name: 'Fuzzy Left',
        defaultBind: ['Control', 'KeyH'],
        currentBind: ['Control', 'KeyH'],
      },
      'fuzzy-right': {
        version: 2,
        name: 'Fuzzy Right',
        defaultBind: ['Control', 'KeyL'],
        currentBind: ['Control', 'KeyL'],
      },
      'fuzzy-up': {
        version: 2,
        name: 'Fuzzy Up',
        defaultBind: ['Control', 'KeyK'],
        currentBind: ['Control', 'KeyK'],
      },
      'fuzzy-down': {
        version: 2,
        name: 'Fuzzy Down',
        defaultBind: ['Control', 'KeyJ'],
        currentBind: ['Control', 'KeyJ'],
      },
      'fuzzy-left-arrow': {
        version: 1,
        name: 'Fuzzy Left Arrow',
        defaultBind: ['ArrowLeft'],
        currentBind: ['ArrowLeft'],
      },
      'fuzzy-right-arrow': {
        version: 1,
        name: 'Fuzzy Right Arrow',
        defaultBind: ['ArrowRight'],
        currentBind: ['ArrowRight'],
      },
      'fuzzy-up-arrow': {
        version: 1,
        name: 'Fuzzy Up Arrow',
        defaultBind: ['ArrowUp'],
        currentBind: ['ArrowUp'],
      },
      'fuzzy-down-arrow': {
        version: 1,
        name: 'Fuzzy Down Arrow',
        defaultBind: ['ArrowDown'],
        currentBind: ['ArrowDown'],
      },
      'select-fuzzy-result': {
        version: 1,
        name: 'Select Fuzzy Result',
        defaultBind: ['Enter'],
        currentBind: ['Enter'],
      },
      'clear-fuzzy-search': {
        version: 1,
        name: 'Clear Fuzzy Search',
        defaultBind: ['Escape'],
        currentBind: ['Escape'],
      },
      'select-search-box': {
        version: 2,
        name: 'Select Search Box',
        defaultBind: ['CmdOrCtrl', 'KeyL'],
        currentBind: ['CmdOrCtrl', 'KeyL'],
      },
      'home-from-webpage': {
        version: 2,
        name: 'Back to Home',
        defaultBind: ['CmdOrCtrl', 'KeyE'],
        currentBind: ['CmdOrCtrl', 'KeyE'],
      },
      'toggle-workspace': {
        version: 1,
        name: 'Toggle Workspace',
        defaultBind: ['Tab'],
        currentBind: ['Tab'],
      },
      'hide-from-home': {
        version: 1,
        name: 'Hide from Home',
        defaultBind: ['Escape'],
        currentBind: ['Escape'],
      },
      'close-web-page': {
        version: 2,
        name: 'Close Web Page',
        defaultBind: ['CmdOrCtrl', 'W'],
        currentBind: ['CmdOrCtrl', 'W'],
      },
      'new-tab': {
        version: 2,
        name: 'New Tab',
        defaultBind: ['CmdOrCtrl', 'KeyT'],
        currentBind: ['CmdOrCtrl', 'KeyT'],
      },
      'snap-left': {
        version: 1,
        name: 'Snap Left',
        defaultBind: ['Alt', 'KeyH'],
        currentBind: ['Alt', 'KeyH'],
      },
      'snap-left-normal': {
        version: 1,
        name: 'Snap Left',
        defaultBind: ['Alt', 'ArrowLeft'],
        currentBind: ['Alt', 'ArrowLeft'],
      },
      'snap-right-normal': {
        version: 1,
        name: 'Snap Left',
        defaultBind: ['Alt', 'ArrowRight'],
        currentBind: ['Alt', 'ArrowRight'],
      },
      'snap-right': {
        version: 1,
        name: 'Snap Right',
        defaultBind: ['Alt', 'KeyL'],
        currentBind: ['Alt', 'KeyL'],
      },
      fullscreen: {
        version: 1,
        name: 'Fullscreen',
        defaultBind: ['Alt', 'KeyK'],
        currentBind: ['Alt', 'KeyK'],
      },
      'fullscreen-normal': {
        version: 2,
        name: 'Fullscreen',
        defaultBind: ['Alt', 'ArrowUp'],
        currentBind: ['Alt', 'ArrowUp'],
      },
      'go-back': {
        version: 1,
        name: 'Go BAck',
        defaultBind: ['CmdOrCtrl', '['],
        currentBind: ['CmdOrCtrl', '['],
      },
      'add-tag': {
        version: 1,
        name: 'Add Tag',
        defaultBind: ['CmdOrCtrl', 'KeyD'],
        currentBind: ['CmdOrCtrl', 'KeyD'],
      },
      'go-to-tag': {
        version: 1,
        name: 'Go to Tag',
        defaultBind: ['Ctrl', 'KeyL'],
        currentBind: ['Ctrl', 'KeyL'],
      },
      'raw-down': {
        version: 1,
        name: 'down',
        defaultBind: ['KeyJ'],
        currentBind: ['KeyJ'],
      },
      'raw-up': {
        version: 1,
        name: 'down',
        defaultBind: ['KeyK'],
        currentBind: ['KeyK'],
      },
    },
  });
}

const modifiers = ['Shift', 'Control', 'Meta', 'Alt']; // shift, ctrl, meta, alt

const singletons = [
  'Insert',
  'Home',
  'PageUp',
  'Delete',
  'End',
  'PageDown',
  'NumpadMultiply',
  'NumpadDivide',
  'NumpadSubtract',
  'NumpadAdd',
  'NumpadDecimal',
];

const badKeys = ['NumpadEnter', 'NumLock', 'ContextMenu'];

export function globalKeybindValid(bind: string[]) {
  let aBad = false;
  bind.forEach((key) => {
    if (badKeys.includes(key)) {
      aBad = true;
    }
  });
  if (aBad) {
    return false;
  }

  const isFn = bind.length === 1 && bind[0][0] === 'F' && bind[0].length <= 3;
  let validChord = false;
  if (bind.length > 1) {
    const hasAMod =
      bind.filter((key) => {
        return modifiers.includes(key);
      }).length > 0;
    const lastNotAMod = !modifiers.includes(bind[bind.length - 1]);
    validChord = hasAMod && lastNotAMod;
  }
  const isSingleton = bind.length === 1 && singletons.includes(bind[0]);
  return isFn || isSingleton || validChord;
}

export function createAndLoadKeybindStore(): Instance<typeof KeybindStore> {
  const keybindStore = defaultKeybindStore();

  const defaultSnapshot = getSnapshot(keybindStore);

  ipcRenderer.on('user-data-path', (_, userDataPath) => {
    keybindStore.setUserDataPath(userDataPath);
    // const json = loadSnapshot(keybindStore, false);
    const jsonData = loadJSON(keybindStore, false);

    if (typeof jsonData !== 'undefined' && jsonData.settings) {
      applySnapshot(keybindStore.settings, jsonData.settings);
    }

    // loading from file overwrites new keybinds so add the defaults back here if they don't exist
    // we also update the data if there is new version but keep the user custom keybind
    Object.entries(defaultSnapshot.binds).forEach(([key, defaultBind]) => {
      // const customBind = keybindStore.binds.get(key);
      const customBinds = jsonData.binds;
      if (customBinds) {
        const customBind = customBinds[key];
        if (!customBind.version || defaultBind.version === customBind.version) {
          keybindStore.setBind(key, customBind.currentBind);
        }
      }
    });

    const binds = getSnapshot(keybindStore.binds);

    Object.entries(binds).forEach(([id, data]) => {
      ipcRenderer.send('rebind-hotkey', {
        hotkeyId: id,
        newBind: data.currentBind,
      });
    });
  });

  ipcRenderer.on('update-toggle-app-hotkey', (_, data) => {
    keybindStore.setBind('toggle-app', data);
  });

  ipcRenderer.send('request-user-data-path');

  return keybindStore;
}
