# Release guide: Google Play

## 0. Checklist before the first upload

- [ ] `src/config/app.json`: final `name`, **`androidPackage` (permanent once uploaded)**, your
      `admobAndroidAppId`, your `privacyPolicyUrl`.
- [ ] `src/config/ads.ts`: real ad unit IDs in `PRODUCTION`, `USE_TEST_ADS = __DEV__`.
- [ ] Icon: replace `assets/icon.png` (1024×1024) and the adaptive icon layers
      `assets/android-icon-foreground.png`, `-background.png`, `-monochrome.png` (432×432, keep the art inside
      the central 66% safe zone). Splash: `assets/splash-icon.png`.
- [ ] Privacy policy hosted (section 3) and linked in Play Console **and** in the app (Settings).
- [ ] `app-ads.txt` on your developer website (AdMob → Apps → app-ads.txt), and that website set in
      the Play listing. Unverified apps earn less.
- [ ] Test a `preview` APK on a real mid-range phone: ads load, consent form shows (use a VPN to an EU
      country or UMP debug geography to see it), sounds, haptics, pause on background.

## 1. Build with EAS

```bash
npm i -g eas-cli
```

```bash
eas login
```

```bash
eas init
```

(`eas init` links the project and writes the project id into your config; commit that change.)

Profiles in `eas.json`:

| profile       | output | use |
|---------------|--------|-----|
| `development` | debug APK with dev client | daily development with `npm start` |
| `preview`     | release APK | sideload on testers' phones, profiling |
| `production`  | signed `.aab` | Play Console upload; `versionCode` auto-increments |

```bash
eas build --platform android --profile development
```

```bash
eas build --platform android --profile preview
```

```bash
eas build --platform android --profile production
```

Optional upload from the CLI (needs a Google service-account JSON key; first upload must be manual):

```bash
eas submit --platform android --profile production
```

### Keystore (signing key) — read this

- On the first production build, answer **"Generate a new Android Keystore"** and let EAS store it.
  This is the simplest safe option.
- Back it up anyway: `eas credentials` → Android → production → *Download credentials*. Keep the
  `.jks` + passwords in a password manager, never in git (`*.jks`, `*.key`, `*.p12` are already in
  `.gitignore`).
- Enable **Play App Signing** (default for new apps). Google then holds the real app-signing key and
  your EAS key is only the *upload key*: if you ever lose it, Play support can reset the upload key.
- Never commit service-account JSON files, keystore passwords or `.env` files.

### Target SDK

Google Play now requires new apps **and every update** to target **Android 16 (API 36)** (since
31 Aug 2026); already-published apps must target at least API 35 to stay visible to new users.
This project sets `targetSdkVersion: 36` / `compileSdkVersion: 36` via `expo-build-properties` in
`app.config.ts`. The deadline moves up one level every August, so check each year:

- Official page: https://developer.android.com/google/play/requirements/target-sdk
- Play Console → your app → *Policy and programs → App content / Policy status* shows warnings.
- Check what you actually built: `npx expo prebuild -p android` then look at
  `android/app/build.gradle` / `android/build.gradle` (`targetSdkVersion`), or inspect the built APK:
  `aapt dump badging app.apk | grep targetSdk` (aapt is in the Android SDK build-tools).

## 2. Play Console setup

1. Create the app (Free, Game, Puzzle). Fill *App content*: privacy policy, ads (**Yes, contains ads**),
   app access (no login), target audience, data safety, content rating, government apps (No),
   financial features (No), health (No).
2. **Closed testing first.** New *personal* developer accounts have had to run a closed test with at
   least **12 testers opted in for 14 consecutive days** before production access is granted. Verify
   the current rule in Play Console → *Dashboard* (it shows the exact requirement for your account) —
   it has changed before. Organization accounts are usually exempt.
3. Upload the `.aab` to *Internal testing* first (instant, up to 100 testers), then *Closed testing*.

## 3. Privacy policy

Free hosting options: GitHub Pages (a `privacy.md` in a public repo), Google Sites, Notion public page,
Netlify/Cloudflare Pages free tier. The URL must be public, not a PDF, and not geo-blocked.

Template (replace the bracketed parts):

> **Privacy Policy for [Fruit Pop Merge]**
> Last updated: [date]
>
> [Your name / studio] ("we") built [Fruit Pop Merge] as an ad-supported free game.
>
> **Data we collect ourselves.** None. Game progress (scores, settings, discovered fruits) is stored
> only on your device and is deleted when you uninstall the app.
>
> **Advertising.** The app shows ads through Google AdMob. AdMob may collect and process the device
> advertising ID, IP address, approximate location derived from IP, device and app information, and ad
> interaction data in order to serve, measure and personalize ads and to prevent fraud. In the
> EEA/UK/Switzerland we ask for your consent through Google's consent form before personalized ads, and
> you can change your choice anytime in Settings → Privacy options. See how Google uses data:
> https://policies.google.com/technologies/partner-sites
>
> **Opting out.** You can reset or delete your advertising ID in your Android settings (Settings →
> Google → Ads / Privacy → Ads).
>
> **Children.** The app is not directed at children under 13 [or the age in your country] and we do not
> knowingly collect their data.
>
> **Changes.** We will post updates on this page.
>
> **Contact.** [email]

## 4. Data safety form (AdMob only, no accounts, no analytics)

Answers for this app as built — re-check if you add analytics, crash reporting or IAP:

- Does your app collect or share any of the required user data types? **Yes** (through the AdMob SDK).
- Is all user data encrypted in transit? **Yes**.
- Do you provide a way for users to request data deletion? **No** (no account; data is on-device only —
  explain in the policy). Some reviewers expect "Yes" if you have a contact email: answer according to
  your actual process.
- Data types:
  - **Device or other IDs** (advertising ID): *Collected* and *Shared*; purposes **Advertising or
    marketing**, **Analytics**, **Fraud prevention, security and compliance**. Not optional for the
    ad-supported experience; processed ephemerally: No.
  - **Location → Approximate location** (from IP): Collected, Shared; Advertising, Analytics, Fraud
    prevention.
  - **App activity → App interactions** (ad interactions): Collected, Shared; Advertising, Analytics.
  - **App info and performance → Diagnostics / Crash logs**: Collected by the Google Mobile Ads SDK;
    purposes Analytics, Fraud prevention.
- Google's reference for these answers: https://developers.google.com/admob/android/privacy/play-data-disclosure

## 5. Content rating and ads declarations

- IARC questionnaire: category *Game / Puzzle*; no violence, no user-generated content, no chat,
  no gambling, no real-money purchases (until you add Remove Ads → then "digital purchases: yes").
  Expect **Everyone / PEGI 3**.
- *Ads* declaration: **Yes, my app contains ads**.
- *Target audience*: choose **13+** (or 13–15, 16–17, 18+). Choosing under-13 puts the app in the
  Families program, which requires child-directed ad settings and certified SDK config — this build
  sets `tagForChildDirectedTreatment: false`, so do not target children without changing that.
- *Advertising ID*: declare that the app uses it for advertising (the `AD_ID` permission is included).

## 6. Store listing

- **Title (≤30):** Fruit Pop Merge
- **Short description (≤80):** Drop, merge and pop cute fruits in a squishy physics puzzle!
- **Full description:**

  > Drop juicy fruits into the jar and watch them bounce, squish and roll. When two of the same fruit
  > touch — POP! — they merge into a bigger one. Cherry → Strawberry → Grape … all the way to the
  > legendary Watermelon. Merge two watermelons for a giant bonus!
  >
  > 🍒 Simple one-finger controls: slide, release, merge
  > 🍉 11 adorable hand-drawn fruits to discover in your Collection
  > 💥 Chain merges for combos and score multipliers
  > 📅 Daily Challenge: everyone gets the same fruits — beat your daily best
  > 🧨 Power-ups: Shake the jar or Bomb a fruit when you're stuck
  > 🎵 Relaxing music, satisfying sounds and haptics
  > 📴 Plays offline
  >
  > Don't let the fruits pile above the line! How high can you score?

- **5 screenshot ideas** (1080×1920 portrait; `npm run preview` gives raw frames to start from):
  1. Mid-game jar full of smiling fruits + caption "Drop. Merge. Pop!"
  2. Close-up of a merge burst with "Combo x5!" — caption "Chain combos for huge scores"
  3. Collection screen with half the fruits silhouetted — "Discover all 11 fruits"
  4. Daily Challenge game-over panel with a new best — "A new challenge every day"
  5. Two watermelons about to touch + bonus popup — "Can you reach the Watermelon?"
- **Feature graphic (1024×500):** the glass jar on the left, overflowing with the fruit cast, a
  watermelon mid-pop with a ring burst, title text "Fruit Pop Merge" in the chunky white-with-purple-
  shadow style on the pastel pink-to-lilac gradient; no small text, no device frames.
