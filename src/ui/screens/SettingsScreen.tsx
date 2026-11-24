import { useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ads } from '../../ads/ads';
import { haptics } from '../../audio/haptics';
import { sound } from '../../audio/sound';
import { APP_VERSION, PRIVACY_POLICY_URL } from '../../config/app';
import { theme } from '../../config/theme';
import { SKU } from '../../iap/products';
import { iapStore, type PurchaseOutcome } from '../../iap/store';
import { useStore } from '../../iap/useStore';
import { storage, type Settings } from '../../storage/storage';
import { Button } from '../components/Button';
import { ShopItem } from '../components/ShopItem';
import type { Navigate } from '../nav';

const OUTCOME_NOTES = {
  pending: "Purchase pending — it'll apply once payment clears.",
  unavailable: 'Store unavailable. Try again later.',
  error: 'Purchase failed.',
  cancelled: '',
} as const;

const ROWS: Array<{ key: keyof Settings; label: string }> = [
  { key: 'music', label: 'Music' },
  { key: 'sfx', label: 'Sound effects' },
  { key: 'haptics', label: 'Vibration' },
];

export function SettingsScreen({ navigate }: { navigate: Navigate }) {
  const insets = useSafeAreaInsets();
  const [s, setS] = useState(storage.getSettings());
  const [privacyRequired, setPrivacyRequired] = useState(false);
  const [note, setNote] = useState('');
  const { adsRemoved } = useStore();

  useEffect(() => {
    ads.privacyOptionsRequired().then(setPrivacyRequired);
  }, []);

  const toggle = (key: keyof Settings, value: boolean) => {
    storage.setSetting(key, value);
    setS((p) => ({ ...p, [key]: value }));
    if (key === 'music') sound.setMusicEnabled(value);
    if (key === 'sfx') sound.setSfxEnabled(value);
    if (key === 'haptics') {
      haptics.setEnabled(value);
      haptics.tap();
    }
  };

  const onResult = (r: PurchaseOutcome) => setNote(r.ok ? 'Thanks! Purchase complete.' : OUTCOME_NOTES[r.reason]);

  const restore = async () => {
    try {
      const n = await iapStore.restore();
      setNote(n > 0 ? `Restored ${n} purchase${n === 1 ? '' : 's'}` : 'Nothing to restore');
    } catch {
      setNote('Restore failed.');
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Settings</Text>
        <Animated.View entering={FadeInDown.springify()} style={styles.card}>
          {ROWS.map((r) => (
            <View key={r.key} style={styles.row}>
              <Text style={styles.label}>{r.label}</Text>
              <Switch value={s[r.key]} onValueChange={(v) => toggle(r.key, v)} trackColor={{ true: theme.accent, false: '#ccc' }} thumbColor="#fff" />
            </View>
          ))}
        </Animated.View>

        <Animated.View entering={FadeInDown.springify().delay(80)} style={[styles.card, styles.shop]}>
          <Text style={styles.shopTitle}>Shop</Text>
          {!adsRemoved && <ShopItem sku={SKU.starterPack} highlight onResult={onResult} />}
          {!adsRemoved && <ShopItem sku={SKU.removeAds} onResult={onResult} />}
          <ShopItem sku={SKU.powerUpPack} onResult={onResult} />
        </Animated.View>

        <View style={styles.actions}>
          <Button small label="Restore purchases" color="#9A86C9" onPress={restore} />
          {privacyRequired && <Button small label="Privacy options" color="#3DBFA8" onPress={() => ads.showPrivacyOptions()} />}
          <Button small label="Privacy policy" color="#9A86C9" onPress={() => Linking.openURL(PRIVACY_POLICY_URL)} />
          {note ? <Text style={styles.note}>{note}</Text> : null}
        </View>

        <Text style={styles.version}>v{APP_VERSION}</Text>
      </ScrollView>
      <Button label="Back" small onPress={() => navigate({ name: 'menu' })} style={{ alignSelf: 'center' }} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 24 },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 12 },
  shop: { marginTop: 16, gap: 6 },
  shopTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: theme.text,
    paddingHorizontal: 12,
    paddingTop: 6,
  },
  title: {
    fontSize: 38,
    fontWeight: '900',
    color: theme.textLight,
    textAlign: 'center',
    textShadowColor: theme.text,
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 0,
    marginBottom: 16,
  },
  card: { backgroundColor: theme.panel, borderRadius: 24, padding: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  label: { fontSize: 18, fontWeight: '800', color: theme.text },
  actions: { marginTop: 20, gap: 12, alignItems: 'center' },
  note: { color: theme.text, fontWeight: '700' },
  version: {
    textAlign: 'center',
    color: theme.text,
    opacity: 0.6,
    marginTop: 16,
  },
});
