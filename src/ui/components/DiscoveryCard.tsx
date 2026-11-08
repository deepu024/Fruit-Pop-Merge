import { StyleSheet, Text } from 'react-native';
import Animated, { FadeOut, ZoomIn } from 'react-native-reanimated';

import { theme } from '../../config/theme';
import { FRUITS } from '../../game/fruits';
import { FruitIcon } from './FruitIcon';

/** "NEW FRUIT!" card shown the first time a player ever creates a fruit. Non-blocking. */
export function DiscoveryCard({ level, top }: { level: number; top: number }) {
  return (
    <Animated.View entering={ZoomIn.springify().damping(9)} exiting={FadeOut.duration(250)} style={[styles.card, { top }]} pointerEvents="none">
      <Text style={styles.kicker}>NEW FRUIT!</Text>
      <FruitIcon level={level} size={92} />
      <Text style={styles.name}>{FRUITS[level].name}</Text>
      <Text style={styles.sub}>
        Level {level + 1} of {FRUITS.length} · added to Collection
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    alignSelf: 'center',
    alignItems: 'center',
    backgroundColor: theme.panel,
    borderRadius: 28,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderWidth: 4,
    borderColor: theme.gold,
  },
  kicker: { fontSize: 14, fontWeight: '900', color: theme.accent2, letterSpacing: 2 },
  name: { fontSize: 26, fontWeight: '900', color: theme.text },
  sub: { fontSize: 12, fontWeight: '700', color: theme.text, opacity: 0.6 },
});
