import { app } from 'electron';
import { init, Mixpanel } from 'mixpanel';
import { Session } from '@supabase/supabase-js';
import packageInfo from '../package.json';

const projectDevToken = '88c46eeab06417e9bf2036451269a022';
const projectToken = 'fa4d29136a737991cef9ae0a39f0b904';

class MixpanelManager {
  userId: string;

  anonId: string;

  mixpanel: Mixpanel;

  constructor(anonId: string) {
    this.userId = anonId;
    this.anonId = anonId;
    const token = app.isPackaged ? projectToken : projectDevToken;
    this.mixpanel = init(token);
    this.track('boot app');
    this.setVersion(anonId);
  }

  setVersion(userId: string) {
    this.mixpanel.people.set(userId, {
      version: packageInfo.version,
    });
  }

  loggedIn(session: Session) {
    if (session.user) {
      const { id, email } = session.user;
      if (id && this.userId !== id) {
        this.userId = id;
        this.setVersion(id);
        if (email) {
          this.mixpanel.people.set(id, {
            email,
          });
        }
      }
    }
  }

  loggedOut() {
    this.userId = this.anonId;
  }

  track(eventName: string, properties = {}) {
    // console.log('track ', eventName);
    this.mixpanel.track(eventName, {
      ...properties,
      distinct_id: this.userId,
    });
  }
}

export default MixpanelManager;
