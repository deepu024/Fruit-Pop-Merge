/**
 * Single source of truth for app identity. Imported by app.config.ts and the app code.
 * Change APP_NAME / ANDROID_PACKAGE here before your first Play Console upload —
 * the package name can never change after publishing.
 */
export const APP_NAME = 'Fruit Pop Merge';
export const APP_SLUG = 'fruit-pop-merge';
export const ANDROID_PACKAGE = 'com.fruitpopmerge.game'; // TODO: use your own reverse-domain id
export const IOS_BUNDLE_ID = 'com.fruitpopmerge.game';
export const APP_VERSION = '1.0.0';
/** Bump on every Play upload (EAS can auto-increment it in the production profile). */
export const ANDROID_VERSION_CODE = 1;

/**
 * AdMob *App* IDs (not ad unit IDs). These are Google's official sample app IDs.
 * TODO(release): replace with your real AdMob app IDs from https://apps.admob.com
 */
export const ADMOB_ANDROID_APP_ID = 'ca-app-pub-3940256099942544~3347511713';
export const ADMOB_IOS_APP_ID = 'ca-app-pub-3940256099942544~1458002511';

/** TODO(release): host your privacy policy (see RELEASE.md) and paste the URL here. */
export const PRIVACY_POLICY_URL = 'https://example.com/privacy';
