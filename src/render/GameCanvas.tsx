import { Canvas, Picture, Skia, type SkPicture } from '@shopify/react-native-skia';
import { memo, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureDetector, useCompetingGestures, usePanGesture, useTapGesture } from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-reanimated';

import type { GameEngine } from '../game/engine';
import { drawFrame, screenToWorld, type Layout } from './drawFrame';
import { preloadFruitArt } from './fruitArt';
import { perf } from './perf';

function emptyPicture() {
  const rec = Skia.PictureRecorder();
  rec.beginRecording(Skia.XYWHRect(0, 0, 1, 1));
  return rec.finishRecordingAsPicture();
}

type Props = { engine: GameEngine; layout: Layout; onDropFailed?: () => void };

/**
 * Game loop + renderer.
 *
 * Why the loop runs on the JS thread (requestAnimationFrame) and not inside a Reanimated
 * useFrameCallback worklet: matter-js is a plain JS library and cannot run on the UI
 * worklet runtime. So each frame we (1) step physics on a fixed 60 Hz accumulator,
 * (2) record the whole scene into ONE SkPicture with a single draw function, and
 * (3) hand it to Skia through a shared value. Skia redraws on the UI thread; React never
 * re-renders during play.
 */
export const GameCanvas = memo(function GameCanvas({ engine, layout, onDropFailed }: Props) {
  const picture = useSharedValue<SkPicture>(emptyPicture());

  useEffect(() => {
    preloadFruitArt();
    let raf = 0;
    let last = 0;
    const bounds = Skia.XYWHRect(0, 0, layout.width, layout.height);
    // keep the last few pictures alive: the UI thread may still be drawing them
    const recent: SkPicture[] = [];
    const loop = (t: number) => {
      const dt = last ? t - last : 16.67;
      last = t;
      const t0 = performance.now();
      engine.tick(dt);
      const rec = Skia.PictureRecorder();
      drawFrame(rec.beginRecording(bounds), engine, layout, t);
      const pic = rec.finishRecordingAsPicture();
      picture.value = pic;
      recent.push(pic);
      if (recent.length > 3) recent.shift()!.dispose();
      perf.frame(dt, performance.now() - t0);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [engine, layout, picture]);

  // Finger lifted: drop the held fruit there, or pop the fruit under it if a bomb is armed.
  const release = (x: number, y: number) => {
    const w = screenToWorld(layout, x, y);
    if (engine.bombArmed) {
      engine.bombAt(w.x, w.y);
      return;
    }
    engine.aim(w.x);
    if (!engine.drop()) onDropFailed?.();
  };

  // Drag-to-aim. A stationary tap never activates a pan (it ends "canceled"),
  // so taps are handled by the competing tap gesture below.
  const pan = usePanGesture({
    runOnJS: true,
    minDistance: 0,
    maxPointers: 1,
    onBegin: (e) => {
      if (!engine.bombArmed) engine.aim(screenToWorld(layout, e.x, e.y).x);
    },
    onUpdate: (e) => {
      if (!engine.bombArmed) engine.aim(screenToWorld(layout, e.x, e.y).x);
    },
    onFinalize: (e) => {
      if (!e.canceled) release(e.x, e.y);
    },
  });

  const tap = useTapGesture({
    runOnJS: true,
    maxDuration: 5000, // press-and-hold then release still counts
    onActivate: (e) => release(e.x, e.y),
  });

  const gesture = useCompetingGestures(pan, tap);

  return (
    <GestureDetector gesture={gesture}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Picture picture={picture} />
      </Canvas>
    </GestureDetector>
  );
});
