import { app } from 'electron';
import { init, Mixpanel } from 'mixpanel';

const projectDevToken = '6e88c4d3f57b5687ddba475e49f2aa45';
const projectToken = '15bdcc7325b32b21052a15413ed77dc2';

class MixpanelManager {
  userId = '';

  mixpanel: Mixpanel;

  constructor(userId: string) {
    this.userId = userId;

    const token = app.isPackaged ? projectToken : projectDevToken;
    this.mixpanel = init(token);
    this.track('boot app');
  }

  track(eventName: string, properties = {}) {
    this.mixpanel.track(eventName, { ...properties, distinct_id: this.userId });
  }
}

export default MixpanelManager;
