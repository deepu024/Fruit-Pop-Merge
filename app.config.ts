import type { ConfigContext, ExpoConfig } from 'expo/config';

import app from './src/config/app.json'; // single source of truth for title, ids, AdMob app ids

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: app.name,
  slug: app.slug,
  version: app.version,
  orientation: 'portrait', // rotation locked
  icon: './assets/icon.png', // TODO(release): 1024x1024 app icon
  userInterfaceStyle: 'light',
  backgroundColor: '#FFD9EC',
  ios: {
    supportsTablet: false,
    bundleIdentifier: app.iosBundleId,
  },
  android: {
    package: app.androidPackage,
    versionCode: app.androidVersionCode,
    adaptiveIcon: {
      // TODO(release): replace these placeholder layers with your own icon
      backgroundColor: '#FFC4D6',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    // AdMob needs these; nothing else (no location, contacts, etc.)
    permissions: ['android.permission.INTERNET', 'android.permission.ACCESS_NETWORK_STATE', 'com.google.android.gms.permission.AD_ID'],
    blockedPermissions: ['android.permission.RECORD_AUDIO', 'android.permission.MODIFY_AUDIO_SETTINGS'],
  },
  plugins: [
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png', // TODO(release): splash artwork
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#FFD9EC',
      },
    ],
    ['expo-audio', { microphonePermission: false, recordAudioAndroid: false }],
    [
      'react-native-google-mobile-ads',
      {
        androidAppId: app.admobAndroidAppId,
        iosAppId: app.admobIosAppId,
        delayAppMeasurementInit: true, // no measurement before UMP consent
        // iOS App Tracking Transparency prompt text (shown by the UMP flow when enabled in AdMob)
        userTrackingUsageDescription: 'This lets us show you ads that are more relevant to you. Your choice does not affect the game.',
      },
    ],
    [
      'expo-build-properties',
      {
        android: {
          // Google Play: new apps + updates must target API 36 since 31 Aug 2026. Expo SDK 58 / RN 0.88
          // default to targetSdk 36 + compileSdk 37 (its libraries need 37). Re-check yearly — see RELEASE.md.
          targetSdkVersion: 36,
          enableMinifyInRelease: true,
          enableShrinkResourcesInRelease: true,
          // R8 strips Room's generated *_Impl classes (WorkManager is pulled in by the Ads SDK),
          // which crashes release builds at startup. Keep them.
          extraProguardRules: [
            '-keep class * extends androidx.room.RoomDatabase { <init>(); }',
            '-keep class androidx.work.impl.** { *; }',
            '-keep class androidx.work.** { *; }',
            '-dontwarn androidx.work.**',
          ].join('\n'),
        },
      },
    ],
    './plugins/withGradleThrottle', // keeps local builds from freezing the Mac
    './plugins/withReleaseSigning', // local upload-key signing; secrets stay in ~/.gradle/gradle.properties
  ],
  extra: {
    eas: {
      // TODO: `eas init` fills this in with your EAS project id
    },
  },
});
