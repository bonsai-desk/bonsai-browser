import { app } from 'electron';
import { init, Mixpanel } from 'mixpanel';
import packageInfo from '../package.json';

const projectDevToken = '88c46eeab06417e9bf2036451269a022';
const projectToken = 'fa4d29136a737991cef9ae0a39f0b904';

class MixpanelManager {
  userId = '';

  mixpanel: Mixpanel;

  constructor(userId: string) {
    this.userId = userId;

    const token = app.isPackaged ? projectToken : projectDevToken;
    this.mixpanel = init(token);
    this.track('boot app');
    this.mixpanel.people.set(this.userId, {
      version: packageInfo.version,
    });
  }

  track(eventName: string, properties = {}) {
    this.mixpanel.track(eventName, { ...properties, distinct_id: this.userId });
  }
}

export default MixpanelManager;
