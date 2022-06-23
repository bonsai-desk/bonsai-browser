import path from 'path';
import { app } from 'electron';
import fs from 'fs';
import { Session } from '@supabase/supabase-js';
import { tryDecrypt } from './utils';
import { tryParseJSON } from './wm-utils';

class SaveData {
  // all values must be nullable and not need a default value
  data: {
    seenEmailForm?: boolean;
    toggledOnce?: boolean;
    session?: Session;
    tabView?: number;
    tilingWidthPercent?: number;
    shouldNotFocusBonsaiBox?: boolean;
  };

  constructor() {
    // dont set default values here because users on older versions wont get the new default data when they update
    this.data = {};
    this.load();
  }

  load() {
    try {
      const saveDataPath = path.join(app.getPath('userData'), 'saveData');
      const saveDataText = fs.readFileSync(saveDataPath, 'utf8');

      const r1 = tryParseJSON(tryDecrypt(saveDataText));
      if (r1.success) {
        this.data = r1.object;
      } else {
        const r2 = tryParseJSON(saveDataText);
        if (r2.success) {
          this.data = r2.object;
        } else {
          // failed to load any data
        }
      }
    } catch {
      //
    }
  }

  save() {
    try {
      const saveDataPath = path.join(app.getPath('userData'), 'saveData');
      const saveDataString = JSON.stringify(this.data, null, '  ');
      fs.writeFileSync(saveDataPath, saveDataString);
    } catch {
      //
    }
  }
}

export default SaveData;
