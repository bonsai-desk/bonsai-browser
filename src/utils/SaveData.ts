import path from 'path';
import { app } from 'electron';
import fs from 'fs';
import { decrypt, encrypt } from './utils';

class SaveData {
  data: { finishedOnboarding?: boolean };

  constructor() {
    this.data = {};
    this.load();
  }

  load() {
    try {
      const saveDataPath = path.join(app.getPath('userData'), 'saveData');
      const saveDataText = fs.readFileSync(saveDataPath, 'utf8');
      this.data = JSON.parse(decrypt(saveDataText));
    } catch {
      //
    }
  }

  save() {
    try {
      const saveDataPath = path.join(app.getPath('userData'), 'saveData');
      const saveDataString = encrypt(JSON.stringify(this.data));
      fs.writeFileSync(saveDataPath, saveDataString);
    } catch {
      //
    }
  }
}

export default SaveData;
