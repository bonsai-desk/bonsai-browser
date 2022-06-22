export const LOWER_BOUND = 20;

// export const VIBRANCY = 'fullscreen-ui';

export const URL_PEEK_HTML = `file://${__dirname}/url-peek.html`;

// export const INDEX_HTML = `file://${__dirname}/index.html`;

export const FIND_HTML = `file://${__dirname}/find.html`;

// export const OVERLAY_HTML = `file://${__dirname}/overlay.html`;

export const TAG_MODAL_HTML = `file://${__dirname}/tag-modal.html`;

export const TAB_PAGE = `file://${__dirname}/tab-page.html`;

export const ONBOARDING_HTML = `file://${__dirname}/onboarding.html`;

export const PRELOAD = `${__dirname}/utils/preload.js`;

export const SUPABASE_URL =
  typeof process.env.REACT_APP_SUPABASE_URL === 'undefined'
    ? ''
    : process.env.REACT_APP_SUPABASE_URL;

export const SUPABASE_ANON_KEY =
  typeof process.env.SUPABASE_ANON_KEY === 'undefined'
    ? ''
    : process.env.SUPABASE_ANON_KEY;

let useAccount = false;
if (typeof process.env.USE_ACCOUNT !== 'undefined') {
  useAccount = process.env.USE_ACCOUNT === 'true';
}

export const USE_ACCOUNT = useAccount;

// export const floatingTitleBarHeight = 37;
// export const floatingTitleBarSpacing = 10;
// export const floatingPadding = 10;

export const headerHeight = 71;

export const tagSideBarWidth = 0; // 200

export const floatingWindowEdgeMargin = 25;

export const FLOATING_BORDER_THICKNESS = 5;

export enum View {
  None,
  Tabs,
  FuzzySearch,
  History,
  Navigator,
  NavigatorDebug,
  Settings,
  TagView,
  AllTagsView,
}
