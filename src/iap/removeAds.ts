import { storage } from '../storage/storage';

/**
 * One-time "Remove Ads" purchase — INTERFACE STUB ONLY.
 *
 * TODO(iap): implement with a billing library, e.g. `react-native-iap` or RevenueCat
 * (`react-native-purchases`), both work in Expo dev builds:
 *   1. Create a managed in-app product with id REMOVE_ADS_SKU in Play Console
 *      (Monetize > Products > In-app products). Requires a merchant account.
 *   2. purchase(): launch the billing flow, verify the purchase (ideally server-side),
 *      ACKNOWLEDGE it within 3 days or Google auto-refunds, then setAdsRemoved(true).
 *   3. restore(): query owned purchases on startup / from Settings and re-apply.
 *   4. Add the BILLING permission (the library's config plugin does this).
 * The rest of the app already respects storage.getAdsRemoved() (banner + interstitial).
 * Rewarded ads stay available because they are opt-in.
 */
export const REMOVE_ADS_SKU = 'remove_ads';

export type PurchaseResult = { ok: true } | { ok: false; reason: 'not_implemented' | 'cancelled' | 'error' };

export const removeAds = {
  isOwned: () => storage.getAdsRemoved(),
  async getPrice(): Promise<string | null> {
    return null; // TODO(iap): fetch localized price
  },
  async purchase(): Promise<PurchaseResult> {
    return { ok: false, reason: 'not_implemented' }; // TODO(iap)
  },
  async restore(): Promise<boolean> {
    return storage.getAdsRemoved(); // TODO(iap)
  },
};
