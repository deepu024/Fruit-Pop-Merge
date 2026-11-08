# Play Store: upload + ASO (store SEO) step by step

Everything in order, from zero to "live". Items marked 🔑 need your own accounts/secrets —
nobody else can do them for you. Companion docs: `RELEASE.md` (privacy, data safety, ratings).

---

## Part A — One-time setup

### A1. Google Play developer account 🔑
1. https://play.google.com/console/signup → choose **Personal** (or **Organization** if you have a
   registered company + D-U-N-S number; org accounts skip the closed-test requirement).
2. Pay the one-time **US$25** fee, verify identity (ID document) and phone. Approval can take days.
3. Use a dedicated email you will keep forever (e.g. `yourstudio.games@gmail.com`).

### A2. AdMob 🔑
1. https://apps.admob.com → Apps → Add app → Android → "not published yet".
2. Copy the **App ID** → `src/config/app.json` → `admobAndroidAppId`.
3. Create 3 ad units: Banner, Interstitial, Rewarded → paste into `src/config/ads.ts` `PRODUCTION`,
   set `USE_TEST_ADS = __DEV__`.
4. AdMob → Privacy & messaging → create a **GDPR message** (and US states message) and publish it —
   the app's UMP consent code shows whatever you configure here.
5. Later (after the app is live) link the app to its Play listing in AdMob and add `app-ads.txt`
   to your website (A4).

### A3. Privacy policy 🔑
1. Fill the 2 `[bracketed]` fields in `docs/privacy.html`.
2. Host free: push the repo to GitHub → Settings → Pages → branch `main`, folder `/docs`
   → URL `https://<you>.github.io/<repo>/privacy.html`. (Repo must be public on the free plan;
   otherwise paste the HTML into Google Sites / Netlify Drop.)
3. Put the URL in `src/config/app.json` → `privacyPolicyUrl`.

### A4. Developer website (tiny, but helps trust + AdMob)
A single GitHub Pages page with the icon, a one-line pitch, a Play badge, the privacy link and an
`app-ads.txt` file at the **root** of the domain (AdMob gives you its one-line content).

### A5. Upload key (signing) 🔑 — do this once, back it up forever
```bash
mkdir -p ~/keys && keytool -genkeypair -v -storetype PKCS12 -keystore ~/keys/fruitpop-upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
```
It asks you for a password and your name — **you** type them. Then add to `~/.gradle/gradle.properties`
(your home folder, never the repo):
```
FPM_UPLOAD_STORE_FILE=/Users/<you>/keys/fruitpop-upload.jks
FPM_UPLOAD_KEY_ALIAS=upload
FPM_UPLOAD_STORE_PASSWORD=<your password>
FPM_UPLOAD_KEY_PASSWORD=<your password>
```
Back up the `.jks` + password in a password manager **and** an offline copy. With Play App Signing
(default) Google keeps the real app key; if you lose this upload key, Play support can reset it,
but it takes days.

---

## Part B — Build the release on your Mac

```bash
npm install
```
```bash
npx expo prebuild --platform android --clean
```
```bash
cd android && ./gradlew :app:bundleRelease
```
Output: `android/app/build/outputs/bundle/release/app-release.aab` ← this is what Play wants.

Before every new upload bump `androidVersionCode` (and `version`) in `src/config/app.json`.
For a sideloadable test APK instead: `./gradlew :app:assembleRelease`
(`app/build/outputs/apk/release/app-release.apk`).

Pre-flight checks:
- [ ] Real AdMob IDs in, `USE_TEST_ADS = __DEV__`
- [ ] `npm test` and `npm run typecheck` green
- [ ] Installed the release APK on a real phone: consent form, ads, sounds, pause on background
- [ ] Final package name (`com.fruitpopmerge.game` — **permanent** after first upload; change now if
      you want your own, e.g. `com.yourname.fruitpop`)

---

## Part C — Create the app in Play Console

1. **Create app** → name `Fruit Pop Merge`, default language English (US), **Game**, **Free**,
   tick the declarations.
2. **Dashboard → Set up your app**, complete every task (answers are in `RELEASE.md` §4–5):
   - Privacy policy URL
   - App access: *All functionality available without special access*
   - Ads: **Yes, contains ads**
   - Content rating: IARC questionnaire → expect *Everyone / PEGI 3*
   - Target audience: **13+** (not under-13 — the ad config is not child-directed)
   - News app: No · COVID: No · Data safety: see `RELEASE.md` §4 · Government: No ·
     Financial features: No · Health: No
   - Advertising ID: **Yes**, used for advertising/analytics
3. **Store settings**: category **Puzzle**, tags (pick up to 5): *Puzzle, Casual, Merge, Physics,
   Relaxing*; contact email (public!), website.

---

## Part D — Store listing + ASO (store SEO)

Play ranks you mostly on: **title > short description > full description** keyword relevance,
plus **install velocity, conversion rate (listing → install), ratings, retention, crash/ANR rates**.
You control the text and graphics; the game quality controls the rest.

### D1. Keyword research (30 min, free)
1. Type seed words into the Play Store search box on a phone and note autocomplete suggestions:
   `merge fruit`, `fruit merge`, `drop fruit`, `watermelon game`, `fruit puzzle`, `merge game`,
   `physics puzzle`, `suika`… → **do not use other games' trademarked names** (e.g. "Suika") in
   your title/description; Google removes listings for that (Metadata policy).
2. Pick 1 primary keyword (**fruit merge**) and 4–6 secondary (*watermelon, drop, puzzle, physics,
   casual, relaxing, offline*).
3. Free tools to sanity-check volume: Google Trends, AppFollow/AppTweak free tiers.

### D2. Title (≤30 chars) — strongest ranking field
Use: **`Fruit Pop Merge: Drop Puzzle`** (28) or **`Fruit Pop Merge – Watermelon`** (28).
Rules: no emojis, no ALL CAPS, no "#1/best/free/new", no prices or rankings.
(If you change it, update `src/config/app.json` → `name` only if you want the home-screen name to
match; the store title can be longer than the launcher name.)

### D3. Short description (≤80 chars) — shown above the fold
`Drop & merge cute fruits into a watermelon! Relaxing physics puzzle game.` (74)

### D4. Full description (≤4000 chars)
Put the primary keyword in the **first sentence**, use the keywords naturally 3–5 times total —
keyword stuffing gets penalised. Template:

```
Fruit Pop Merge is a cute fruit merge puzzle: drop fruits into the jar, match two of the same, and watch them POP into a bigger fruit — all the way up to the giant Watermelon!

🍒 HOW TO PLAY
• Slide your finger to aim, release to drop
• Two identical fruits touch → they merge into the next fruit
• Keep the jar below the line — easy to learn, hard to master

🍉 FEATURES
• 11 adorable hand-drawn fruits with squishy, bouncy physics
• Chain merges for combos and big score multipliers
• Daily Challenge: the same fruit sequence for everyone, every day
• Power-ups: Shake the jar or Bomb a stubborn fruit
• Collection book: discover every fruit
• Relaxing music, satisfying sounds and haptics
• Play offline — no Wi-Fi needed
• Small download, runs smoothly on most phones

Perfect for quick breaks: one-finger controls, no timers, no pressure. How big can your fruit get?

Questions or ideas? Email us at <your email> — we read everything.
```

### D5. Graphics (already made — `docs/store/`)
- App icon 512×512 → `icon-512.png` (biggest conversion lever; keep it simple, no text)
- Feature graphic 1024×500 → `feature-graphic.png`
- Phone screenshots → `screenshot-01…05.png` (first 2–3 matter most: they show in search results)
- Optional but recommended: a **15–30 s promo video** on YouTube (screen-record real gameplay,
  first 3 s must show a satisfying merge; no letterboxing). Paste the YouTube URL in the listing.

### D6. Localize (big, cheap win)
Store listing → *Manage translations* → add at least: Spanish (es-419, es-ES), Portuguese (pt-BR),
Hindi, Indonesian, German, French, Japanese, Korean, Turkish. Translate title/short/full text
(machine translation is OK as a start; have a native speaker check the title + short line).
Localized listings rank in that country's search and convert noticeably better.

### D7. Custom store listings / experiments (after launch)
Store listing experiments (A/B): test icon variants first, then screenshot order, then short
description. Run each ≥7 days, ≥ a few thousand visitors.

---

## Part E — Testing tracks (required order for new personal accounts)

1. **Internal testing** → Create release → upload `app-release.aab` → release notes → Save →
   Review → **Start rollout**. Add up to 100 testers by email; they install via the opt-in link.
   Minutes to available. Use it to check the Play-signed build works (ads, consent).
2. **Closed testing** (personal accounts created after Nov 2023): needs **at least 12 testers
   opted in for 14 consecutive days** before you can apply for production — **verify the current
   numbers on your Dashboard**, Google has changed them before. Get testers from friends, family,
   Reddit r/AndroidClosedTesting, Discord tester-swap groups. Ask them to actually play a few days.
3. Dashboard → **Apply for production access** → short questionnaire about your testing.
   Review usually takes a few days.
4. **Production** → Create release → same `.aab` (or a new one with higher versionCode) →
   choose countries (all, or start with a few) → **staged rollout 20%** → watch Android vitals 1–2
   days → 100%.

---

## Part F — After launch (what actually moves rankings)

- **Ratings:** ask for a review at a happy moment — e.g. right after a new personal best or first
  Watermelon, max once per ~2 weeks, never after a game over. Use the official in-app review API
  (`expo-store-review`, `StoreReview.requestReview()`); never offer rewards for reviews (policy).
- **Reply to every review** in the first months, especially 1–3★; fix and say so.
- **Android vitals:** keep crash rate < 1.09% and ANR < 0.47% (bad-behaviour thresholds), or Play
  demotes the app. Check Play Console → Quality → Android vitals weekly.
- **Update every 2–4 weeks** with something visible (new jar skin, event, mode) + release notes —
  freshness and returning users help ranking.
- **Retention features** from the improvement list (streaks, missions, coins/skins) raise D1/D7
  retention, which Play weighs heavily.
- **Cross-promo:** short gameplay clips on YouTube Shorts / Instagram Reels / TikTok with the Play
  link; the near-miss + combo slow-mo moments are the most clip-able.
- **Pre-registration** (optional, before production): lets people sign up and get auto-installed on
  launch day — good if you build an audience first.
- Track installs/uninstalls by country in Play Console → Statistics; localize further where you grow.

## Policy pitfalls that get games rejected
- Using another game's name/art/sounds or "like X" in the listing
- Misleading screenshots (ours are real engine renders — keep it that way)
- Ads: interstitials during gameplay, accidental-click placements, no consent in EEA
- Missing/unreachable privacy policy, Data safety form not matching the SDKs
- Targeting children without Families-compliant ad settings
