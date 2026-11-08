/**
 * App identity, re-exported from app.json so app.config.ts (which can only load JSON/JS)
 * and the app share ONE source of truth. Edit src/config/app.json:
 *  - name / androidPackage: change BEFORE your first Play upload; the package is permanent.
 *  - admob*AppId: Google's sample app IDs. TODO(release): use your AdMob app IDs.
 *  - privacyPolicyUrl: TODO(release): your hosted policy (see RELEASE.md).
 *  - androidVersionCode: bump per upload (EAS autoIncrement handles it for production).
 */
import app from './app.json';

export const APP_NAME = app.name;
export const APP_VERSION = app.version;
export const PRIVACY_POLICY_URL = app.privacyPolicyUrl;
