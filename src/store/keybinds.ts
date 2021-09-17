import { applySnapshot, getSnapshot, Instance, types } from 'mobx-state-tree';
import { ipcRenderer } from 'electron';
import path from 'path';
import fs from 'fs';
import { decrypt, encrypt } from '../utils/utils';
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

const keyMap: Record<string, string | Record<string, string>> = {
  Control: 'Ctrl',
  Meta: { Win: 'Win', Mac: '⌘' },
  Alt: { Win: 'Alt', Mac: '⌥' },
  Backslash: '\\',
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

export function bindEquals(a: string[], b: string[]) {
  const lenMatch = a.length === b.length;
  let charMatch = true;
  a.forEach((code, i) => {
    charMatch = charMatch && code === b[i];
  });
  return charMatch && lenMatch;
}

export function createAndLoadKeybindStore(): Instance<typeof KeybindStore> {
  const keybindStore = defaultKeybindStore();

  ipcRenderer.send('request-user-data-path');

  ipcRenderer.on('user-data-path', (_, userDataPath) => {
    keybindStore.setUserDataPath(userDataPath);
    loadSnapshot(keybindStore, false);
    const binds = getSnapshot(keybindStore.binds);
    Object.entries(binds).forEach(([id, data]) => {
      ipcRenderer.send('rebind-hotkey', {
        hotkeyId: id,
        newBind: data.currentBind,
      });
    });
  });

  return keybindStore;
}
