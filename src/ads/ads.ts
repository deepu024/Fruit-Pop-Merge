import mobileAds, { AdEventType, AdsConsent, InterstitialAd, MaxAdContentRating, RewardedAd, RewardedAdEventType } from 'react-native-google-mobile-ads';

import { AD_UNITS, INTERSTITIAL_EVERY, INTERSTITIAL_MIN_GAMES, TEST_DEVICE_IDS } from '../config/ads';
import { shouldShowInterstitial } from '../game/scoring';
import { storage } from '../storage/storage';

/**
 * AdMob wrapper: UMP consent -> SDK init -> preload interstitial + rewarded.
 * Every call is safe to make before init or when ads fail: it just resolves false.
 */
let ready = false;
let interstitial: InterstitialAd | null = null;
let interstitialLoaded = false;
let rewarded: RewardedAd | null = null;
let rewardedLoaded = false;
const readyListeners = new Set<(loaded: boolean) => void>();

function loadInterstitial() {
  if (!ready || storage.getAdsRemoved()) return;
  interstitialLoaded = false;
  interstitial = InterstitialAd.createForAdRequest(AD_UNITS.interstitial);
  interstitial.addAdEventListener(AdEventType.LOADED, () => (interstitialLoaded = true));
  interstitial.addAdEventListener(AdEventType.ERROR, () => {
    interstitialLoaded = false;
    setTimeout(loadInterstitial, 30_000);
  });
  interstitial.load();
}

function setRewardedLoaded(v: boolean) {
  rewardedLoaded = v;
  readyListeners.forEach((l) => l(v));
}

function loadRewarded() {
  if (!ready) return;
  setRewardedLoaded(false);
  rewarded = RewardedAd.createForAdRequest(AD_UNITS.rewarded);
  rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => setRewardedLoaded(true));
  rewarded.addAdEventListener(AdEventType.ERROR, () => {
    setRewardedLoaded(false);
    setTimeout(loadRewarded, 30_000);
  });
  rewarded.load();
}

export const ads = {
  /**
   * Call once at startup. Shows the Google UMP consent form when required (EEA/UK/CH),
   * then initializes the SDK only if ads may be requested.
   */
  async init(): Promise<void> {
    try {
      const consent = await AdsConsent.gatherConsent();
      if (!consent.canRequestAds) return;
      await mobileAds().setRequestConfiguration({
        tagForChildDirectedTreatment: false,
        tagForUnderAgeOfConsent: false,
        maxAdContentRating: MaxAdContentRating.PG,
        testDeviceIdentifiers: ['EMULATOR', ...TEST_DEVICE_IDS],
      });
      await mobileAds().initialize();
      ready = true;
      loadInterstitial();
      loadRewarded();
    } catch (e) {
      console.warn('[ads] init failed', e);
    }
  },

  get isReady() {
    return ready;
  },

  /** Whether the "Privacy options" button must be shown in Settings (GDPR requirement). */
  async privacyOptionsRequired(): Promise<boolean> {
    try {
      const info = await AdsConsent.getConsentInfo();
      return info.privacyOptionsRequirementStatus === 'REQUIRED';
    } catch {
      return false;
    }
  },

  async showPrivacyOptions() {
    try {
      await AdsConsent.showPrivacyOptionsForm();
    } catch {}
  },

  /** Interstitial on game over only, paced by the rule in config/ads.ts. */
  maybeShowInterstitial(gameOverNumber: number): boolean {
    if (!shouldShowInterstitial(gameOverNumber, INTERSTITIAL_EVERY, INTERSTITIAL_MIN_GAMES, storage.getAdsRemoved())) return false;
    if (!interstitial || !interstitialLoaded) return false;
    const ad = interstitial;
    ad.addAdEventListener(AdEventType.CLOSED, loadInterstitial);
    ad.show().catch(loadInterstitial);
    interstitialLoaded = false;
    return true;
  },

  rewardedReady: () => rewardedLoaded,
  onRewardedReady(cb: (loaded: boolean) => void) {
    readyListeners.add(cb);
    return () => {
      readyListeners.delete(cb);
    };
  },

  /** Shows a rewarded ad; resolves true only if the user earned the reward. */
  showRewarded(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!rewarded || !rewardedLoaded) return resolve(false);
      const ad = rewarded;
      let earned = false;
      const subs = [
        ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => (earned = true)),
        ad.addAdEventListener(AdEventType.CLOSED, () => {
          subs.forEach((u) => u());
          loadRewarded();
          resolve(earned);
        }),
      ];
      setRewardedLoaded(false);
      ad.show().catch(() => {
        subs.forEach((u) => u());
        loadRewarded();
        resolve(false);
      });
    });
  },
};
