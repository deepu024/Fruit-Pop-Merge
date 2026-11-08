import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';

import { AD_UNITS } from '../config/ads';
import { storage } from '../storage/storage';
import { ads } from './ads';

/** Small adaptive banner. Rendered on the main menu only — never during play. */
export function MenuBanner() {
  const [show, setShow] = useState(ads.isReady);
  useEffect(() => {
    if (show) return;
    const id = setInterval(() => ads.isReady && setShow(true), 1000);
    return () => clearInterval(id);
  }, [show]);
  if (!show || storage.getAdsRemoved()) return null;
  return (
    <View style={{ alignItems: 'center' }}>
      <BannerAd unitId={AD_UNITS.banner} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
    </View>
  );
}
