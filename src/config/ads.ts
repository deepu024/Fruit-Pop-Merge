/**
 * Ad unit IDs. Defaults are Google's official TEST unit IDs, which are always safe to
 * click and never earn money. NEVER click your own real ads.
 *
 * TODO(release): create Banner, Interstitial and Rewarded units in AdMob and paste
 * their IDs below, then set USE_TEST_ADS to false (or keep it tied to __DEV__).
 */
// dev builds + release builds made with EXPO_PUBLIC_TEST_ADS=1 (sideload/QA APKs): Google test ads.
// Store builds: your real units below.
export const USE_TEST_ADS = __DEV__ || process.env.EXPO_PUBLIC_TEST_ADS === '1';

const TEST = {
  banner: 'ca-app-pub-3940256099942544/9214589741', // adaptive banner
  gameBanner: 'ca-app-pub-3940256099942544/6300978111', // fixed-size banner
  interstitial: 'ca-app-pub-3940256099942544/1033173712',
  rewarded: 'ca-app-pub-3940256099942544/5224354917',
};

const PRODUCTION = {
  banner: 'ca-app-pub-4301072725271018/8527613194', // menu_banner
  // TODO(release): create a separate "game_banner" unit in AdMob and paste it here so menu and
  // in-game banners report separately. Reusing menu_banner until then is allowed and earns normally.
  gameBanner: 'ca-app-pub-4301072725271018/8527613194',
  interstitial: 'ca-app-pub-4301072725271018/9106022681', // gameover_interstitial
  rewarded: 'ca-app-pub-4301072725271018/8148339245', // rewarded_continue_powerup
};

export const AD_UNITS = USE_TEST_ADS ? TEST : PRODUCTION;

/**
 * Your own phones: real ad units show labelled test ads on these devices, so you can check
 * real IDs safely. Find the ID in logcat after one ad request:
 *   adb logcat | grep -i "test device"
 * ("Use RequestConfiguration.Builder().setTestDeviceIds(Arrays.asList("ABC123..."))").
 */
export const TEST_DEVICE_IDS: string[] = [];

/** Interstitial pacing: every Nth game over, never before game number MIN_GAMES + 1. */
export const INTERSTITIAL_EVERY = 3;
export const INTERSTITIAL_MIN_GAMES = 2;
/** Rewarded power-up ads allowed per run. */
export const REWARDED_POWERUPS_PER_RUN = 2;
