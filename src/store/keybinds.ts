import { applySnapshot, getSnapshot, Instance, types } from 'mobx-state-tree';
import { ipcRenderer } from 'electron';
import path from 'path';
import fs from 'fs';
import { chord, decrypt, encrypt } from '../utils/utils';
import { myPlatform, Platform } from '../render-constants';

function loadSnapshot(store: Instance<any>, encrypted = true) {
  if (store.userDataPath !== '') {
    try {
      const snapshotPath = path.join(store.userDataPath, 'keybindSnapshot');
      const json = fs.readFileSync(snapshotPath, 'utf8');
      if (json !== '') {
        const storeSnapshot = JSON.parse(encrypted ? decrypt(json) : json);
        applySnapshot(store, storeSnapshot);
      }
    } catch {
      //
    }
  }
}

function saveSnapshot(store: Instance<any>, encrypted = true) {
  if (store.userDataPath !== '') {
    try {
      const snapshotPath = path.join(store.userDataPath, 'keybindSnapshot');
      const snapshot = getSnapshot(store);
      const snapshotString = JSON.stringify(snapshot);
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
}

export enum Bind {
  FuzzyLeft = 'fuzzy-left',
  FuzzyRight = 'fuzzy-right',
  FuzzyUp = 'fuzzy-up',
  FuzzyDown = 'fuzzy-down',
}

const KeyBind = types
  .model({
    name: types.string,
    defaultBind: types.array(types.string),
    currentBind: types.array(types.string),
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

export const KeybindStore = types
  .model({ binds: types.map(KeyBind) })
  .volatile(() => ({
    userDataPath: '',
  }))
  .actions((self) => ({
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
    loadFromFile(fileURI: string) {
      console.warn('load from file not implemented', fileURI);
    },
    saveSnapshot() {
      saveSnapshot(self, false);
    },
  }))
  .views((self) => ({
    isBind(e: KeyboardEvent, bind: Bind): boolean {
      // ipcRenderer.send('log-data', { bind });
      // ipcRenderer.send('log-data', getSnapshot(self.binds));
      const internalChord = self.binds.get(bind);
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
    binds: {
      'toggle-floating-window': {
        name: 'Toggle Floating Window',
        defaultBind: ['Meta', 'Backslash'],
        currentBind: ['Meta', 'Backslash'],
      },
      'toggle-app': {
        name: 'Toggle App',
        defaultBind: ['Alt', 'Space'],
        currentBind: ['Alt', 'Space'],
      },
      'fuzzy-left': {
        name: 'Fuzzy Left',
        defaultBind: ['Control', 'KeyH'],
        currentBind: ['Control', 'KeyH'],
      },
      'fuzzy-right': {
        name: 'Fuzzy Right',
        defaultBind: ['Control', 'KeyL'],
        currentBind: ['Control', 'KeyL'],
      },
      'fuzzy-up': {
        name: 'Fuzzy Up',
        defaultBind: ['Control', 'KeyK'],
        currentBind: ['Control', 'KeyK'],
      },
      'fuzzy-down': {
        name: 'Fuzzy Down',
        defaultBind: ['Control', 'KeyJ'],
        currentBind: ['Control', 'KeyJ'],
      },
      'fuzzy-left-arrow': {
        name: 'Fuzzy Left Arrow',
        defaultBind: ['ArrowLeft'],
        currentBind: ['ArrowLeft'],
      },
      'fuzzy-right-arrow': {
        name: 'Fuzzy Right Arrow',
        defaultBind: ['ArrowRight'],
        currentBind: ['ArrowRight'],
      },
      'fuzzy-up-arrow': {
        name: 'Fuzzy Up Arrow',
        defaultBind: ['ArrowUp'],
        currentBind: ['ArrowUp'],
      },
      'fuzzy-down-arrow': {
        name: 'Fuzzy Down Arrow',
        defaultBind: ['ArrowDown'],
        currentBind: ['ArrowDown'],
      },
      'select-fuzzy-result': {
        name: 'Select Fuzzy Result',
        defaultBind: ['Enter'],
        currentBind: ['Enter'],
      },
      'clear-fuzzy-search': {
        name: 'Clear Fuzzy Search',
        defaultBind: ['Escape'],
        currentBind: ['Escape'],
      },
      'select-search-box': {
        name: 'Select Search Box',
        defaultBind: ['Meta', 'KeyL'],
        currentBind: ['Meta', 'KeyL'],
      },
      'home-from-webpage': {
        name: 'Back to Home',
        defaultBind: ['Meta', 'KeyE'],
        currentBind: ['Meta', 'KeyE'],
      },
      'toggle-workspace': {
        name: 'Toggle Workspace',
        defaultBind: ['Tab'],
        currentBind: ['Tab'],
      },
      'hide-from-home': {
        name: 'Hide from Home',
        defaultBind: ['Escape'],
        currentBind: ['Escape'],
      },
      'close-web-page': {
        name: 'Close Web Page',
        defaultBind: ['Meta', 'W'],
        currentBind: ['Meta', 'W'],
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

  ipcRenderer.send('request-user-data-path');

  ipcRenderer.on('user-data-path', (_, userDataPath) => {
    keybindStore.setUserDataPath(userDataPath);
    loadSnapshot(keybindStore, false);

    // loading from file overwrites new keybinds so add the defaults back here if they don't exist
    Object.entries(defaultSnapshot.binds).forEach(([key, bind]) => {
      const newBind = keybindStore.binds.get(key);
      if (!newBind) {
        keybindStore.addBind(key, bind);
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
    // ipcRenderer.send('log-data', { update: data });
    keybindStore.setBind('toggle-app', data);
  });

  return keybindStore;
}
