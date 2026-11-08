import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '../../config/theme';
import { FRUITS } from '../../game/fruits';
import { storage } from '../../storage/storage';
import { Button } from '../components/Button';
import { FruitIcon } from '../components/FruitIcon';
import type { Navigate } from '../nav';

export function CollectionScreen({ navigate }: { navigate: Navigate }) {
  const insets = useSafeAreaInsets();
  const found = storage.getDiscovered();
  const count = found.filter(Boolean).length;
  return (
    <View style={[styles.root, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
      <Text style={styles.title}>Collection</Text>
      <Text style={styles.sub}>
        {count} / {FRUITS.length} discovered
      </Text>
      <ScrollView contentContainerStyle={styles.grid}>
        {FRUITS.map((f, i) => (
          <Animated.View key={f.name} entering={ZoomIn.delay(i * 50).springify()} style={styles.cell}>
            <FruitIcon level={i} size={84} silhouette={!found[i]} />
            <Text style={styles.name}>{found[i] ? f.name : '???'}</Text>
            <Text style={styles.lvl}>Lv {i + 1}</Text>
          </Animated.View>
        ))}
      </ScrollView>
      <Button label="Back" small onPress={() => navigate({ name: 'menu' })} style={{ alignSelf: 'center' }} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 16 },
  title: { fontSize: 38, fontWeight: '900', color: theme.textLight, textAlign: 'center', textShadowColor: theme.text, textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 0 },
  sub: { textAlign: 'center', color: theme.text, fontWeight: '800', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, paddingBottom: 16 },
  cell: { width: 104, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 20, paddingVertical: 8 },
  name: { fontWeight: '900', color: theme.text, marginTop: 2 },
  lvl: { fontSize: 11, color: theme.text, opacity: 0.6, fontWeight: '700' },
});
