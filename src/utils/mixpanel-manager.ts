import { app } from 'electron';
import { init, Mixpanel } from 'mixpanel';
import { Session } from '@supabase/supabase-js';
import packageInfo from '../package.json';

const projectDevToken = process.env.MIXPANEL_PROJECT_DEV_TOKEN;
const projectToken = process.env.MIXPANEL_PROJECT_TOKEN;

class MixpanelManager {
  userId: string;

  anonId: string;

  mixpanel: Mixpanel | undefined;

  constructor(anonId: string) {
    this.userId = anonId;
    this.anonId = anonId;
    const token = app.isPackaged ? projectToken : projectDevToken;
    if (token) {
      this.mixpanel = init(token);
    }
    this.track('boot app');
    this.setVersion(anonId);
  }

  setVersion(userId: string) {
    if (!this.mixpanel) {
      return;
    }
    this.mixpanel.people.set(userId, {
      version: packageInfo.version,
    });
  }

  loggedIn(session: Session) {
    if (!this.mixpanel) {
      return;
    }
    if (session.user) {
      const { id, email } = session.user;
      if (id && this.userId !== id) {
        this.userId = id;
        this.setVersion(id);
        this.track('auth logged in');
        if (email) {
          this.mixpanel.people.set(id, {
            email,
            $email: email,
          });
          this.track('auth logged in (email)');
        }
      }
    }
  }

  loggedOut() {
    this.userId = this.anonId;
  }

  track(eventName: string, properties = {}) {
    if (!this.mixpanel) {
      return;
    }
    this.mixpanel.track(eventName, {
      ...properties,
      distinct_id: this.userId,
      os: process.platform,
      version: packageInfo.version,
    });
  }

  setUserProp(properties = {}) {
    if (!this.mixpanel) {
      return;
    }
    if (this.userId && this.userId !== '') {
      this.mixpanel.people.set(this.userId, properties);
    }
  }
}

export default MixpanelManager;
