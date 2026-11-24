import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, BackHandler, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, FadeOut, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ads } from '../../ads/ads';
import { haptics } from '../../audio/haptics';
import { sound } from '../../audio/sound';
import { REWARDED_POWERUPS_PER_RUN } from '../../config/ads';
import { theme } from '../../config/theme';
import { GameEngine, type GameEvent } from '../../game/engine';
import { dailySeed, dateKey, randomSeed } from '../../game/rng';
import { computeLayout } from '../../render/drawFrame';
import { GameCanvas } from '../../render/GameCanvas';
import { storage, type PowerUpKind } from '../../storage/storage';
import { Button } from '../components/Button';
import { DiscoveryCard } from '../components/DiscoveryCard';
import { FruitIcon } from '../components/FruitIcon';
import { Tutorial } from '../components/Tutorial';
import type { GameMode, Navigate } from '../nav';
import { useCountUp } from '../useCountUp';

const HUD_H = 64;
/** Overlay panels ease in once, no spring overshoot (a springy slide wobbled for seconds). */
const panelIn = (delay = 0) => FadeInDown.duration(240).delay(delay).easing(Easing.out(Easing.cubic));
const BAR_H = 84;

type Over = { score: number; best: number; newBest: boolean };

export function GameScreen({ mode, navigate }: { mode: GameMode; navigate: Navigate }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [run, setRun] = useState(0);
  const engine = useMemo(() => new GameEngine({ seed: mode === 'daily' ? dailySeed() : randomSeed() }), [mode, run]);
  const layout = useMemo(() => computeLayout(width, height, insets.top + HUD_H, insets.bottom + BAR_H), [width, height, insets.top, insets.bottom]);

  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState<Over | null>(null);
  const [power, setPower] = useState({ ...engine.powerUps });
  const [bomb, setBomb] = useState(false);
  const [inv, setInv] = useState(storage.getInventory());
  const bombFromInv = useRef(false); // armed bomb was taken from purchased inventory
  const [adsUsed, setAdsUsed] = useState(0);
  const [rewardReady, setRewardReady] = useState(ads.rewardedReady());
  const [toast, setToast] = useState<string | null>(null);
  const [discovery, setDiscovery] = useState<number | null>(null);
  const runEnded = useRef(false);
  const today = useMemo(() => dateKey(), []);

  // ------------------------------------------------------------ engine events
  useEffect(() => {
    runEnded.current = false;
    setOver(null);
    setPaused(false);
    setBomb(false);
    bombFromInv.current = false;
    setInv(storage.getInventory());
    setAdsUsed(0);
    setPower({ ...engine.powerUps });
    const discovered = storage.getDiscovered();
    const off = engine.on((e: GameEvent) => {
      switch (e.type) {
        case 'drop':
          sound.play('drop');
          break;
        case 'merge':
          sound.merge(e.level);
          haptics.merge(e.level);
          storage.addMerges(1);
          break;
        case 'vanish':
          sound.play('vanish');
          haptics.success();
          storage.addMerges(1);
          break;
        case 'combo':
          if (e.count >= 3) sound.play('combo');
          break;
        case 'discover':
          if (!discovered[e.level] && storage.discover(e.level)) {
            discovered[e.level] = true;
            // spawnable fruits are found by dropping; celebrate the ones earned by merging
            if (e.level >= 5) {
              setDiscovery(e.level);
              engine.slowMo(700);
              sound.play('powerup');
            }
          }
          break;
        case 'powerups':
          setPower({ shake: e.shake, bomb: e.bomb });
          if (e.earned) {
            sound.play('powerup');
            setToast(e.earned === 'shake' ? 'Combo reward: +1 Shake!' : 'Combo reward: +1 Bomb!');
          }
          break;
        case 'bomb':
          setBomb(e.armed);
          if (!e.armed) bombFromInv.current = false; // popped a fruit: the inventory bomb is spent
          break;
        case 'gameover': {
          if (bombFromInv.current) {
            // engine disarms silently on game over: give back the bomb taken from inventory
            bombFromInv.current = false;
            engine.adjustPowerUp('bomb', -1);
            storage.addInventory('bomb', 1);
            setInv(storage.getInventory());
          }
          sound.play('gameover');
          haptics.gameOver();
          const newBest = mode === 'daily' ? storage.submitDailyBest(today, e.score) : storage.submitBest(e.score);
          const best = mode === 'daily' ? storage.getDailyBest(today) : storage.getBest();
          setOver({ score: e.score, best, newBest });
          break;
        }
      }
    });
    // the engine itself is just garbage-collected; only our listener needs removing
    return off;
  }, [engine, mode, today]);

  useEffect(() => ads.onRewardedReady(setRewardReady), []);

  useEffect(() => {
    if (discovery === null) return;
    const id = setTimeout(() => setDiscovery(null), 2200);
    return () => clearTimeout(id);
  }, [discovery]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 1800);
    return () => clearTimeout(id);
  }, [toast]);

  // ------------------------------------------------------------ pause / lifecycle
  const pause = useCallback(
    (p: boolean) => {
      if (engine.gameOver) return;
      engine.paused = p;
      setPaused(p);
    },
    [engine],
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') {
        pause(true);
        sound.setMusicPlaying(false);
      } else sound.setMusicPlaying(true);
    });
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!engine.gameOver) pause(!engine.paused);
      return true;
    });
    return () => {
      sub.remove();
      back.remove();
    };
  }, [engine, pause]);

  // ------------------------------------------------------------ run end
  const endRun = useCallback(
    (next: () => void) => {
      if (!runEnded.current) {
        runEnded.current = true;
        if (engine.gameOver) {
          const n = storage.incGamesPlayed();
          ads.maybeShowInterstitial(n); // between games only, never during play
        } else if (mode === 'daily') storage.submitDailyBest(today, engine.score);
        else storage.submitBest(engine.score);
      }
      next();
    },
    [engine, mode, today],
  );

  const restart = () => endRun(() => setRun((r) => r + 1));
  const home = () => endRun(() => navigate({ name: 'menu' }));

  const watchForContinue = async () => {
    if (await ads.showRewarded()) {
      engine.continueRun();
      setOver(null);
    }
  };

  const watchForPowerUp = async () => {
    engine.paused = true;
    const ok = await ads.showRewarded();
    engine.paused = paused;
    if (ok) {
      setAdsUsed((n) => n + 1);
      engine.grantPowerUp(Math.random() < 0.5 ? 'shake' : 'bomb');
    }
  };

  /** Moves one purchased power-up into the run. False if the inventory has none. */
  const takeFromInventory = (p: PowerUpKind): boolean => {
    if (!storage.takeInventory(p)) return false;
    engine.adjustPowerUp(p, 1);
    setInv(storage.getInventory());
    return true;
  };

  /** Returns an armed-but-unused inventory bomb to the inventory (cancel or game over). */
  const refundInventoryBomb = () => {
    if (!bombFromInv.current) return;
    bombFromInv.current = false;
    engine.adjustPowerUp('bomb', -1);
    storage.addInventory('bomb', 1);
    setInv(storage.getInventory());
  };

  /** Run's own shake first; otherwise spend a purchased one. Only consumed if the shake can actually happen. */
  const doShake = () => {
    if (engine.paused || engine.gameOver) return;
    if (engine.powerUps.shake > 0 || takeFromInventory('shake')) engine.useShake();
  };

  /** Arming uses the run's bomb or takes a purchased one; cancelling an inventory bomb returns it. */
  const doBomb = () => {
    if (engine.paused || engine.gameOver) return;
    if (engine.bombArmed) {
      engine.toggleBomb();
      refundInventoryBomb();
    } else if (engine.powerUps.bomb > 0) {
      engine.toggleBomb();
    } else if (takeFromInventory('bomb')) {
      bombFromInv.current = true;
      engine.toggleBomb();
    }
  };

  const canAdPower = !over && adsUsed < REWARDED_POWERUPS_PER_RUN && rewardReady;

  return (
    <View style={styles.root}>
      <GameCanvas engine={engine} layout={layout} />

      {/* HUD */}
      <View style={[styles.hud, { top: insets.top, height: HUD_H }]} pointerEvents="box-none">
        <ScoreBox engine={engine} mode={mode} today={today} />
        <NextBox engine={engine} />
        <View style={styles.pauseWrap}>
          <Pressable onPress={() => pause(true)} style={styles.pauseBtn} hitSlop={12} accessibilityLabel="Pause">
            <View style={styles.pauseBar} />
            <View style={styles.pauseBar} />
          </Pressable>
        </View>
      </View>

      {/* power-ups */}
      <View style={[styles.bar, { bottom: insets.bottom + 10 }]} pointerEvents="box-none">
        <Button small label={`Shake ${power.shake + inv.shake}`} color="#3DBFA8" disabled={power.shake + inv.shake <= 0 || !!over} onPress={doShake} />
        <Button small label={bomb ? 'Cancel' : `Bomb ${power.bomb + inv.bomb}`} color={bomb ? '#FF4D6D' : '#FF9F1C'} disabled={(!bomb && power.bomb + inv.bomb <= 0) || !!over} onPress={doBomb} />
        {canAdPower && <Button small label="+1" badge="AD" color={theme.accent2} onPress={watchForPowerUp} />}
      </View>

      {bomb && (
        <Animated.View entering={FadeIn} exiting={FadeOut} style={[styles.banner, { top: insets.top + HUD_H + 8 }]} pointerEvents="none">
          <Text style={styles.bannerText}>Tap a fruit to pop it</Text>
        </Animated.View>
      )}
      <Tutorial key={`tut-${run}`} engine={engine} top={insets.top + HUD_H + 8} />
      {discovery !== null && <DiscoveryCard level={discovery} top={insets.top + HUD_H + 70} />}
      {toast && (
        <Animated.View entering={FadeIn.springify()} exiting={FadeOut} style={[styles.banner, styles.toast, { top: insets.top + HUD_H + 8 }]} pointerEvents="none">
          <Text style={styles.bannerText}>{toast}</Text>
        </Animated.View>
      )}

      {paused && !over && (
        <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(150)} style={styles.overlay}>
          <Animated.View entering={panelIn()} style={styles.panel}>
            <Text style={styles.panelTitle}>Paused</Text>
            <Button label="Resume" onPress={() => pause(false)} />
            <Button label="Restart" color={theme.accent2} onPress={restart} />
            <Button label="Home" color="#9A86C9" onPress={home} />
          </Animated.View>
        </Animated.View>
      )}

      {over && (
        <Animated.View entering={FadeIn.duration(250)} style={styles.overlay}>
          <GameOverPanel over={over} mode={mode} canContinue={!engine.continued && rewardReady} onContinue={watchForContinue} onRestart={restart} onHome={home} />
        </Animated.View>
      )}
    </View>
  );
}

// ------------------------------------------------------------ HUD pieces
function ScoreBox({ engine, mode, today }: { engine: GameEngine; mode: GameMode; today: string }) {
  const [score, setScore] = useState(engine.score);
  const best = useMemo(() => (mode === 'daily' ? storage.getDailyBest(today) : storage.getBest()), [mode, today]);
  const s = useSharedValue(1);
  useEffect(() => {
    setScore(engine.score);
    return engine.on((e) => {
      if (e.type !== 'score') return;
      setScore(e.score);
      s.value = withSequence(withTiming(1.25, { duration: 70 }), withSpring(1, { damping: 6, stiffness: 300 }));
    });
  }, [engine, s]);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <View style={styles.scoreBox}>
      <Animated.Text style={[styles.score, st]}>{score.toLocaleString()}</Animated.Text>
      <Text style={styles.bestText}>
        {mode === 'daily' ? 'Daily best' : 'Best'} {Math.max(best, score).toLocaleString()}
      </Text>
    </View>
  );
}

function NextBox({ engine }: { engine: GameEngine }) {
  const [next, setNext] = useState(engine.nextLevel);
  const s = useSharedValue(1);
  useEffect(() => {
    setNext(engine.nextLevel);
    return engine.on((e) => {
      if (e.type !== 'drop') return;
      setNext(engine.nextLevel);
      s.value = withSequence(withTiming(0.6, { duration: 60 }), withSpring(1, { damping: 7, stiffness: 260 }));
    });
  }, [engine, s]);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <View style={styles.nextWrap}>
      <Animated.View style={[styles.nextBubble, st]}>
        <FruitIcon level={next} size={46} />
      </Animated.View>
      <Text style={styles.nextLabel}>NEXT</Text>
    </View>
  );
}

function GameOverPanel(props: { over: Over; mode: GameMode; canContinue: boolean; onContinue: () => void; onRestart: () => void; onHome: () => void }) {
  const { over } = props;
  const shown = useCountUp(over.score);
  return (
    <Animated.View entering={panelIn(150)} exiting={FadeOut.duration(150)} style={styles.panel}>
      <Text style={styles.panelTitle}>{props.mode === 'daily' ? 'Daily Over' : 'Game Over'}</Text>
      <Text style={styles.bigScore}>{shown.toLocaleString()}</Text>
      {over.newBest ? (
        <Animated.Text entering={FadeIn.delay(1100)} style={styles.newBest}>
          New best!
        </Animated.Text>
      ) : (
        <Text style={styles.bestLine}>Best {over.best.toLocaleString()}</Text>
      )}
      {props.canContinue && <Button label="Continue" badge="AD" color={theme.good} onPress={props.onContinue} />}
      <Button label="Restart" onPress={props.onRestart} />
      <Button label="Home" color="#9A86C9" onPress={props.onHome} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hud: { position: 'absolute', left: 12, right: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  scoreBox: { minWidth: 120 },
  score: { fontSize: 34, fontWeight: '900', color: theme.textLight, textShadowColor: theme.text, textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 0, alignSelf: 'flex-start' },
  bestText: { fontSize: 13, fontWeight: '800', color: theme.text, opacity: 0.8 },
  nextWrap: { alignItems: 'center' },
  nextBubble: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.55)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
  nextLabel: { fontSize: 10, fontWeight: '900', color: theme.text, letterSpacing: 1, marginTop: 1 },
  pauseBtn: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.7)', flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' },
  pauseWrap: { minWidth: 120, alignItems: 'flex-end' },
  pauseBar: { width: 7, height: 20, borderRadius: 3, backgroundColor: theme.text },
  bar: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 10 },
  banner: { position: 'absolute', alignSelf: 'center', backgroundColor: 'rgba(74,45,94,0.85)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16 },
  toast: { backgroundColor: 'rgba(124,92,255,0.92)' },
  bannerText: { color: '#fff', fontWeight: '800' },
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: theme.overlay, justifyContent: 'center', alignItems: 'center' },
  panel: { backgroundColor: theme.panel, borderRadius: 32, padding: 24, alignItems: 'center', gap: 12, minWidth: 290 },
  panelTitle: { fontSize: 34, fontWeight: '900', color: theme.text },
  bigScore: { fontSize: 56, fontWeight: '900', color: theme.accent },
  bestLine: { fontSize: 16, fontWeight: '800', color: theme.text, opacity: 0.7 },
  newBest: { fontSize: 20, fontWeight: '900', color: theme.gold, textShadowColor: theme.text, textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 0 },
});
