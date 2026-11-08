# AdMob setup guide (Fruit Pop Merge)

AdMob is free: Google shows ads in your game and pays you a share of the revenue. Until you finish
this guide the app shows Google's **test ads** — safe to tap, earn nothing.

Time needed: ~30 minutes, plus waiting for Google's app review later.

> ⚠️ Never tap real ads in your own app and never ask friends to. Google detects it and can
> permanently ban the account (and withhold earnings). Use test devices (step 6).

---

## 1. Create the account
1. Go to https://admob.google.com → **Get started** → sign in with your Google account
   (can be the same one as Play Console).
2. Country + time zone (**cannot be changed later** — pick where you live/pay tax).
3. Billing currency, accept terms. Done.

## 2. Add the app
1. **Apps → Add app → Android**.
2. "Is the app listed on a supported app store?" → **No** (not published yet). You link the Play
   listing later (step 9).
3. App name: `Fruit Pop Merge`. User metrics: on.
4. Copy the **App ID** — looks like `ca-app-pub-1234567890123456~1234567890` (note the **~**).
5. Paste it into `src/config/app.json`:
   ```json
   "admobAndroidAppId": "ca-app-pub-1234567890123456~1234567890",
   ```

## 3. Create 3 ad units (these match the code)
In the app → **Ad units → Add ad unit**. Each gives an ID with a **/**
(`ca-app-pub-1234567890123456/1234567890`).

| Ad unit type | Name it | Used in the game for | Settings |
|---|---|---|---|
| **Banner** | `menu_banner` | Small banner on the main menu only | defaults |
| **Interstitial** | `gameover_interstitial` | Every 3rd game over (never in first 2 games, never during play) | defaults |
| **Rewarded** | `rewarded_continue_powerup` | "Watch ad to Continue" + "+1 power-up" | Reward amount `1`, item `reward`; server-side verification **off** |

Paste the three IDs into `src/config/ads.ts`:
```ts
const PRODUCTION = {
  banner: 'ca-app-pub-1234567890123456/1111111111',
  interstitial: 'ca-app-pub-1234567890123456/2222222222',
  rewarded: 'ca-app-pub-1234567890123456/3333333333',
};
```
and switch to real ads for release builds:
```ts
export const USE_TEST_ADS = __DEV__;
```
(Dev builds keep test ads; release builds use your real units.)

## 4. Consent messages (GDPR + US states) — required
The game already runs Google's consent flow (UMP) before loading ads; you only configure the text.
1. **Privacy & messaging → European regulations → Create message** → select your app,
   language English (add more later), add your **privacy policy URL**, tick
   "Consent / Manage options" (default) → **Publish**.
2. **Privacy & messaging → US state regulations → Create message** → select app → **Publish**.
3. (Optional) **IDFA explainer** is iOS only — skip for Android.

Without a published EU message, users in the EEA/UK get no personalized ads → much lower revenue,
and you're out of policy.

## 5. Rebuild the app
App ID changes are native config, so do a full rebuild:
```bash
npx expo prebuild --platform android --clean
```
```bash
cd android && ./gradlew :app:bundleRelease
```

## 6. Test safely with real IDs (test devices)
1. Install the release build on your phone, open the menu (banner loads).
2. Find your device's test ID:
   ```bash
   adb logcat | grep -i "test device"
   ```
   It prints something like `setTestDeviceIds(Arrays.asList("33BE2250B43518CCDA7DE426D04EE231"))`.
3. Put it in `src/config/ads.ts`:
   ```ts
   export const TEST_DEVICE_IDS: string[] = ['33BE2250B43518CCDA7DE426D04EE231'];
   ```
   Rebuild. Ads on that phone now show a **"Test Ad"** label even with real units — tap freely.
   (Alternative: AdMob → Settings → Test devices → Add.)
4. Check: banner on menu, rewarded on "Continue" after game over, interstitial on 3rd game over,
   consent form (use a VPN to an EU country, or it only appears for EEA users).

New ad units can show **"no fill"** (blank) for the first hours to a couple of days — that's normal.

## 7. Payments (needed before your first payout)
**Payments → Payment info**:
1. Name + address (must match your bank account).
2. **Tax info** (India: PAN; US: W-9; elsewhere: W-8BEN). Missing tax info = higher withholding.
3. Add bank account → Google sends a small test deposit; confirm the amount.
4. **PIN verification**: when you first earn ≥ $10 Google mails a PIN letter to your address
   (2–4 weeks). Enter it in AdMob. Keep the address correct!
5. Payout once your balance ≥ your country's threshold (US $100; India ₹8,000), around the 21st of
   the month after.

## 8. app-ads.txt (protects your revenue)
1. AdMob → **Apps → View all apps → app-ads.txt** tab → copy your line, e.g.
   `google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0`
2. Put it in a file named `app-ads.txt` at the **root** of your developer website
   (e.g. `https://yourname.github.io/app-ads.txt` — for GitHub Pages that's a repo named
   `yourname.github.io`).
3. The same website URL must be in your Play listing (Store settings → Website).
4. AdMob re-crawls within ~24 h and shows "Verified". Unverified apps lose many advertisers.

## 9. After the app is live on Play
1. AdMob → your app → **App settings → Add app store details** → search the Play listing → link.
2. Google reviews the app (**App readiness**: "Getting ready" → "Ready"); limited ads until then,
   usually a few days.
3. Watch **Policy center** weekly; fix any issue fast.

## 10. Earn more (optional, later)
- **Rewarded ads earn the most** — the game already offers them only where players want them.
- **Mediation** (AdMob → Mediation): add networks like Meta Audience Network, AppLovin, Unity Ads
  once you have steady traffic; each needs its SDK + adapter (a native rebuild).
- **eCPM floors**: leave off at first; tune after a month of data.
- Keep the game's pacing rules (interstitial every 3rd game over) — aggressive ads hurt retention and
  Play ranking more than they earn.

## Quick checklist
- [ ] App ID in `src/config/app.json`
- [ ] 3 unit IDs in `src/config/ads.ts` `PRODUCTION`, `USE_TEST_ADS = __DEV__`
- [ ] EU + US consent messages published
- [ ] Your phone in `TEST_DEVICE_IDS`
- [ ] Full rebuild, tested banner / rewarded / interstitial / consent
- [ ] Payment + tax info, bank verified, PIN entered when it arrives
- [ ] `app-ads.txt` on your website, website in Play listing
- [ ] App linked to Play listing after launch
