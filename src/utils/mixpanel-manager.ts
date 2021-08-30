/* eslint class-methods-use-this: off */

import { app } from 'electron';

const Mixpanel = require('mixpanel');

const projectDevToken = '3450398c23014cc3e96e7d8238db3bb9';
const projectToken = 'bd5e50b762f1fa079a9620ad50f71b50';

class MixpanelManager {
  userId = '';

  // mixpanel: any;

  constructor(userId: string) {
    this.userId = userId;

    const token = app.isPackaged ? projectToken : projectDevToken;
    const mixpanel = Mixpanel.init(token);
    mixpanel.track('test event');
    // this.mixpanel = Mixpanel.init(token, { debug: true });
    // console.log('init mixpanel');
    //
    // this.mixpanel.identify(userId);
    //
    // this.mixpanel.track('start application');
  }

  track(event: string) {
    // this.mixpanel.track(event);
    // console.log('tracked event');
  }
}

export default MixpanelManager;
