/**
 * Ad unit IDs. Defaults are Google's official TEST unit IDs, which are always safe to
 * click and never earn money. NEVER click your own real ads.
 *
 * TODO(release): create Banner, Interstitial and Rewarded units in AdMob and paste
 * their IDs below, then set USE_TEST_ADS to false (or keep it tied to __DEV__).
 */
export const USE_TEST_ADS = true; // TODO(release): change to `__DEV__` once real IDs are in PRODUCTION

const TEST = {
  banner: 'ca-app-pub-3940256099942544/9214589741', // adaptive banner
  interstitial: 'ca-app-pub-3940256099942544/1033173712',
  rewarded: 'ca-app-pub-3940256099942544/5224354917',
};

const PRODUCTION = {
  banner: 'ca-app-pub-XXXXXXXXXXXXXXXX/NNNNNNNNNN', // TODO(release)
  interstitial: 'ca-app-pub-XXXXXXXXXXXXXXXX/NNNNNNNNNN', // TODO(release)
  rewarded: 'ca-app-pub-XXXXXXXXXXXXXXXX/NNNNNNNNNN', // TODO(release)
};

export const AD_UNITS = USE_TEST_ADS ? TEST : PRODUCTION;

/** Interstitial pacing: every Nth game over, never before game number MIN_GAMES + 1. */
export const INTERSTITIAL_EVERY = 3;
export const INTERSTITIAL_MIN_GAMES = 2;
/** Rewarded power-up ads allowed per run. */
export const REWARDED_POWERUPS_PER_RUN = 2;
