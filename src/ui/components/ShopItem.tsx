import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { theme } from '../../config/theme';
import { GRANTS, type Sku } from '../../iap/products';
import type { PurchaseOutcome } from '../../iap/store';
import { iapStore } from '../../iap/store';
import { useStore } from '../../iap/useStore';
import { Button } from './Button';

/** One-line summary of what a SKU grants, e.g. "No banner or between-game ads · 10 Shakes · 10 Bombs". */
function describe(sku: Sku): string {
  const g = GRANTS[sku];
  const parts: string[] = [];
  if (g.removeAds) parts.push('No banner or between-game ads');
  if (g.shake) parts.push(`${g.shake} Shakes`);
  if (g.bomb) parts.push(`${g.bomb} Bombs`);
  return parts.join(' · ');
}

type Props = {
  sku: Sku;
  highlight?: boolean;
  onResult: (r: PurchaseOutcome) => void;
};

/** Shop row: title, what you get, and a buy button with the localized price. */
export function ShopItem({ sku, highlight, onResult }: Props) {
  const { ready, product } = useStore();
  const [busy, setBusy] = useState(false);
  const p = product(sku);

  const buy = async () => {
    if (busy) return;
    setBusy(true);
    try {
      onResult(await iapStore.purchase(sku));
    } catch {
      onResult({ ok: false, reason: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.item, highlight && styles.highlight]}>
      <View style={styles.text}>
        <Text style={styles.title}>
          {p.title}
          {highlight ? '  ★ Best value' : ''}
        </Text>
        <Text style={styles.desc}>{describe(sku)}</Text>
      </View>
      <Button small label={busy ? '…' : (p.price ?? '…')} color={highlight ? theme.accent2 : theme.accent} disabled={!ready || busy || p.price === null} onPress={buy} />
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 18,
  },
  highlight: {
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderWidth: 2,
    borderColor: theme.gold,
  },
  text: { flex: 1 },
  title: { fontSize: 17, fontWeight: '900', color: theme.text },
  desc: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.text,
    opacity: 0.7,
    marginTop: 2,
  },
});
