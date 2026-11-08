/**
 * Config plugin: signs local release builds with YOUR upload key when it is configured,
 * otherwise falls back to the debug key (fine for sideloading, rejected by Play).
 *
 * Secrets never live in this repo. Put these four lines in ~/.gradle/gradle.properties
 * (your user-level Gradle file, outside git):
 *
 *   FPM_UPLOAD_STORE_FILE=/Users/you/keys/fruitpop-upload.jks
 *   FPM_UPLOAD_KEY_ALIAS=upload
 *   FPM_UPLOAD_STORE_PASSWORD=...
 *   FPM_UPLOAD_KEY_PASSWORD=...
 *
 * See RELEASE.md "Signing locally" for creating the key.
 */
const { withAppBuildGradle } = require('expo/config-plugins');

const SIGNING = `
        release {
            if (project.hasProperty('FPM_UPLOAD_STORE_FILE')) {
                storeFile file(FPM_UPLOAD_STORE_FILE)
                storePassword FPM_UPLOAD_STORE_PASSWORD
                keyAlias FPM_UPLOAD_KEY_ALIAS
                keyPassword FPM_UPLOAD_KEY_PASSWORD
            }
        }`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let g = cfg.modResults.contents;
    if (g.includes('FPM_UPLOAD_STORE_FILE')) return cfg; // already applied
    // 1) add a release signing config next to the debug one
    g = g.replace(/(signingConfigs\s*\{\s*\n\s*debug\s*\{[\s\S]*?\n\s*\})/, `$1${SIGNING}`);
    // 2) use it for release builds when the key is configured
    g = g.replace(
      /(release\s*\{[^{}]*?)signingConfig signingConfigs\.debug/,
      "$1signingConfig project.hasProperty('FPM_UPLOAD_STORE_FILE') ? signingConfigs.release : signingConfigs.debug",
    );
    if (!g.includes("project.hasProperty('FPM_UPLOAD_STORE_FILE') ? signingConfigs.release")) {
      throw new Error('withReleaseSigning: build.gradle layout changed; update the plugin');
    }
    cfg.modResults.contents = g;
    return cfg;
  });
};
