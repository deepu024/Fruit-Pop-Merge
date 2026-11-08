import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MenuBanner } from '../../ads/MenuBanner';
import { APP_NAME } from '../../config/app';
import { theme } from '../../config/theme';
import { dateKey } from '../../game/rng';
import { storage } from '../../storage/storage';
import { Button } from '../components/Button';
import { FruitIcon } from '../components/FruitIcon';
import type { Navigate } from '../nav';

function BouncyFruit({ level, delay }: { level: number; delay: number }) {
  const y = useSharedValue(0);
  useEffect(() => {
    y.value = withDelay(delay, withRepeat(withSequence(withTiming(-14, { duration: 420 }), withTiming(0, { duration: 420 })), -1, false));
  }, [delay, y]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }, { scaleY: 1 + (y.value === 0 ? 0 : -y.value / 200) }] }));
  return (
    <Animated.View style={st}>
      <FruitIcon level={level} size={58} />
    </Animated.View>
  );
}

export function MenuScreen({ navigate }: { navigate: Navigate }) {
  const insets = useSafeAreaInsets();
  const best = storage.getBest();
  const daily = storage.getDailyBest(dateKey());
  const [first, ...rest] = APP_NAME.split(' ');

  return (
    <View style={[styles.root, { paddingTop: insets.top + 24, paddingBottom: insets.bottom }]}>
      <Animated.View entering={FadeInDown.springify().damping(12)} style={styles.titleWrap}>
        <View style={styles.fruitRow}>
          {[0, 2, 5, 8, 10].map((l, i) => (
            <BouncyFruit key={l} level={l} delay={i * 120} />
          ))}
        </View>
        <Text style={styles.title}>{first}</Text>
        <Text style={[styles.title, styles.title2]}>{rest.join(' ')}</Text>
        <Text style={styles.best}>Best {best.toLocaleString()}</Text>
      </Animated.View>

      <View style={styles.buttons}>
        <Animated.View entering={FadeInDown.delay(120).springify()}>
          <Button label="Play" onPress={() => navigate({ name: 'game', mode: 'classic' })} />
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <Button label={daily ? `Daily  ·  ${daily}` : 'Daily Challenge'} color={theme.accent2} onPress={() => navigate({ name: 'game', mode: 'daily' })} />
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(280).springify()} style={styles.row}>
          <Button small label="Collection" color="#FF9F1C" onPress={() => navigate({ name: 'collection' })} />
          <Button small label="Settings" color="#3DBFA8" onPress={() => navigate({ name: 'settings' })} />
        </Animated.View>
        <Text style={styles.stats}>{storage.getTotalMerges().toLocaleString()} merges all-time</Text>
      </View>

      <MenuBanner />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'space-between', alignItems: 'center' },
  titleWrap: { alignItems: 'center', marginTop: 12 },
  fruitRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, marginBottom: 6, height: 74 },
  title: { fontSize: 54, fontWeight: '900', color: theme.textLight, textShadowColor: theme.text, textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 0, lineHeight: 60 },
  title2: { color: theme.gold, marginTop: -6 },
  best: { marginTop: 10, fontSize: 18, fontWeight: '800', color: theme.text, backgroundColor: 'rgba(255,255,255,0.6)', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16, overflow: 'hidden' },
  buttons: { alignItems: 'center', gap: 14 },
  row: { flexDirection: 'row', gap: 12 },
  stats: { color: theme.text, opacity: 0.7, fontWeight: '700', marginTop: 4 },
});
