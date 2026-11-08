import { Canvas, Circle, LinearGradient, Rect, vec } from '@shopify/react-native-skia';
import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { Easing, useDerivedValue, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { theme } from '../../config/theme';

const BUBBLES = Array.from({ length: 10 }, (_, i) => ({ x: (i * 0.37) % 1, r: 6 + ((i * 7) % 18), speed: 0.6 + ((i * 13) % 10) / 10, offset: (i * 0.29) % 1 }));

function Bubble({ t, b, w, h }: { t: { value: number }; b: (typeof BUBBLES)[number]; w: number; h: number }) {
  const cy = useDerivedValue(() => {
    const y = (((b.offset - t.value * b.speed) % 1) + 1) % 1;
    return y * (h + 60) - 30;
  });
  const cx = useDerivedValue(() => b.x * w + Math.sin(t.value * 12 + b.offset * 10) * 14);
  return <Circle cx={cx} cy={cy} r={b.r} color="rgba(255,255,255,0.25)" />;
}

/** Menu background: drifting gradient + floating bubbles, animated on the UI thread. */
export function Backdrop() {
  const { width: w, height: h } = useWindowDimensions();
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 40000, easing: Easing.linear }), -1, false);
  }, [t]);
  const end = useDerivedValue(() => vec(w * (0.3 + 0.4 * Math.sin(t.value * Math.PI * 2)), h));
  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Rect x={0} y={0} width={w} height={h}>
        <LinearGradient start={vec(0, 0)} end={end} colors={theme.bgA} />
      </Rect>
      {BUBBLES.map((b, i) => (
        <Bubble key={i} t={t} b={b} w={w} h={h} />
      ))}
    </Canvas>
  );
}
