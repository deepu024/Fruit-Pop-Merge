import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ads } from './src/ads/ads';
import { iapStore } from './src/iap/store';
import { sound } from './src/audio/sound';
import { Backdrop } from './src/ui/components/Backdrop';
import type { Screen } from './src/ui/nav';
import { CollectionScreen } from './src/ui/screens/CollectionScreen';
import { GameScreen } from './src/ui/screens/GameScreen';
import { MenuScreen } from './src/ui/screens/MenuScreen';
import { SettingsScreen } from './src/ui/screens/SettingsScreen';

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'menu' });

  useEffect(() => {
    sound.init().then(() => sound.setMusicPlaying(true));
    ads.init(); // UMP consent first, then SDK init + preload
    iapStore.init(); // Play Billing: connect, load prices, re-apply owned purchases
  }, []);

  // Simple state-based screen switch; each screen fades in/out (Reanimated layout animations).
  const key = screen.name === 'game' ? `game-${screen.mode}` : screen.name;
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Backdrop />
        <Animated.View key={key} entering={FadeIn.duration(260)} exiting={FadeOut.duration(160)} style={StyleSheet.absoluteFill}>
          {screen.name === 'menu' && <MenuScreen navigate={setScreen} />}
          {screen.name === 'game' && <GameScreen mode={screen.mode} navigate={setScreen} />}
          {screen.name === 'collection' && <CollectionScreen navigate={setScreen} />}
          {screen.name === 'settings' && <SettingsScreen navigate={setScreen} />}
        </Animated.View>
        <View pointerEvents="none" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: '#FFD9EC' } });
