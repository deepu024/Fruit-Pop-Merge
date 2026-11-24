import { StyleSheet, View } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';

import { AD_UNITS } from '../config/ads';
import { storage } from '../storage/storage';
import { ads } from './ads';

/**
 * Fixed 320x50 banner, so the space the game reserves for it is known before it loads
 * (an adaptive banner's height is only known after loading, which would resize the jar mid-run).
 */
const BANNER_H = 50;
/** Clear gap between the banner and the power-up buttons, to avoid accidental taps. */
const GAP = 12;

/** Height the game screen keeps free at the bottom while the banner is shown. */
export const GAME_BANNER_SPACE = BANNER_H + GAP;

/** Decided once per run: show only if ads are initialized and the player hasn't removed them. */
export const gameBannerEligible = () => ads.isReady && !storage.getAdsRemoved();

/** Bottom-anchored banner for the game screen. Render it last so overlays never cover it. */
export function GameBanner({ bottom }: { bottom: number }) {
  return (
    <View style={[styles.wrap, { bottom, height: BANNER_H }]} pointerEvents="box-none">
      <BannerAd unitId={AD_UNITS.gameBanner} size={BannerAdSize.BANNER} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
});
