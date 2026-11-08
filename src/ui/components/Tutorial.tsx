import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { theme } from '../../config/theme';
import type { GameEngine } from '../../game/engine';
import { storage } from '../../storage/storage';

type Step = 'aim' | 'merge' | 'nice' | 'done';

const TEXT: Record<Exclude<Step, 'done'>, string> = {
  aim: 'Drag to aim, let go to drop',
  merge: 'Two of the same fruit touch → they MERGE!',
  nice: 'Nice! Now keep the jar below the line 🎉',
};

/** First-run coach marks. Advances on real game events, never blocks input. */
export function Tutorial({ engine, top }: { engine: GameEngine; top: number }) {
  const [step, setStep] = useState<Step>(() => (storage.getTutorialDone() ? 'done' : 'aim'));
  const x = useSharedValue(-70);

  useEffect(() => {
    x.value = withRepeat(withSequence(withTiming(70, { duration: 900, easing: Easing.inOut(Easing.quad) }), withTiming(-70, { duration: 900, easing: Easing.inOut(Easing.quad) })), -1);
  }, [x]);

  useEffect(() => {
    if (step === 'done') return;
    return engine.on((e) => {
      if (e.type === 'drop') setStep((s) => (s === 'aim' ? 'merge' : s));
      if (e.type === 'merge') setStep((s) => (s === 'merge' ? 'nice' : s));
    });
  }, [engine, step]);

  useEffect(() => {
    if (step !== 'nice') return;
    storage.setTutorialDone();
    const id = setTimeout(() => setStep('done'), 2600);
    return () => clearTimeout(id);
  }, [step]);

  const finger = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  if (step === 'done') return null;

  return (
    <View style={[styles.wrap, { top }]} pointerEvents="none">
      <Animated.View key={step} entering={FadeIn.duration(250)} exiting={FadeOut.duration(150)} style={styles.bubble}>
        <Text style={styles.text}>{TEXT[step]}</Text>
      </Animated.View>
      {step === 'aim' && <Animated.Text style={[styles.finger, finger]}>👆</Animated.Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  bubble: { backgroundColor: 'rgba(74,45,94,0.88)', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 18, maxWidth: 320 },
  text: { color: theme.textLight, fontWeight: '800', fontSize: 16, textAlign: 'center' },
  finger: { fontSize: 44, marginTop: 8 },
});
