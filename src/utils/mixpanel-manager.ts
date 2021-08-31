/* eslint class-methods-use-this: off */

import { app } from 'electron';

const Mixpanel = require('mixpanel');

const projectDevToken = '6e88c4d3f57b5687ddba475e49f2aa45';
const projectToken = '15bdcc7325b32b21052a15413ed77dc2';

class MixpanelManager {
  userId = '';

  // mixpanel: any;

  constructor(userId: string) {
    this.userId = userId;

    const token = app.isPackaged ? projectToken : projectDevToken;
    const mixpanel = Mixpanel.init(token);
    mixpanel.track(
      'test event',
      { distinct_id: userId, ip: '127.0.0.1' },
      (err) => {
        console.log('woo');
        console.log(err);
      }
    );
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
