import { createMMKV } from 'react-native-mmkv';

import { FRUITS } from '../game/fruits';

/** Thin typed wrapper around MMKV. All persistent keys live here. */
const kv = createMMKV({ id: 'fruit-pop-merge' });

const K = {
  best: 'best',
  totalMerges: 'totalMerges',
  gamesPlayed: 'gamesPlayed',
  discovered: 'discovered', // bitmask of fruit levels ever created
  music: 'settings.music',
  sfx: 'settings.sfx',
  haptics: 'settings.haptics',
  adsRemoved: 'iap.adsRemoved',
  tutorialDone: 'tutorialDone',
  daily: (date: string) => `daily.best.${date}`,
  invShake: 'inv.shake',
  invBomb: 'inv.bomb',
  granted: (token: string) => `iap.granted.${token}`,
};

export type PowerUpKind = 'shake' | 'bomb';
export type Inventory = Record<PowerUpKind, number>;

const num = (k: string, d = 0) => kv.getNumber(k) ?? d;
const bool = (k: string, d: boolean) => kv.getBoolean(k) ?? d;

export type Settings = { music: boolean; sfx: boolean; haptics: boolean };

export const storage = {
  getBest: () => num(K.best),
  /** Saves and returns true if `score` is a new best. */
  submitBest(score: number): boolean {
    if (score <= num(K.best)) return false;
    kv.set(K.best, score);
    return true;
  },

  getDailyBest: (date: string) => num(K.daily(date)),
  submitDailyBest(date: string, score: number): boolean {
    if (score <= num(K.daily(date))) return false;
    kv.set(K.daily(date), score);
    return true;
  },

  getTotalMerges: () => num(K.totalMerges),
  addMerges(n: number) {
    if (n > 0) kv.set(K.totalMerges, num(K.totalMerges) + n);
  },

  getGamesPlayed: () => num(K.gamesPlayed),
  /** Increments and returns the new count (1-based game-over number). */
  incGamesPlayed(): number {
    const n = num(K.gamesPlayed) + 1;
    kv.set(K.gamesPlayed, n);
    return n;
  },

  getDiscovered(): boolean[] {
    const mask = num(K.discovered, 0);
    return FRUITS.map((_, i) => (mask & (1 << i)) !== 0);
  },
  /** Returns true if this level was newly discovered. */
  discover(level: number): boolean {
    const mask = num(K.discovered, 0);
    if (mask & (1 << level)) return false;
    kv.set(K.discovered, mask | (1 << level));
    return true;
  },

  getSettings: (): Settings => ({ music: bool(K.music, true), sfx: bool(K.sfx, true), haptics: bool(K.haptics, true) }),
  setSetting(key: keyof Settings, value: boolean) {
    kv.set(K[key], value);
  },

  getTutorialDone: () => bool(K.tutorialDone, false),
  setTutorialDone: () => kv.set(K.tutorialDone, true),

  getAdsRemoved: () => bool(K.adsRemoved, false),
  setAdsRemoved: (v: boolean) => kv.set(K.adsRemoved, v),

  /** Purchased power-ups, kept across runs. Used only after a run's free ones run out. */
  getInventory: (): Inventory => ({ shake: num(K.invShake), bomb: num(K.invBomb) }),
  addInventory(p: PowerUpKind, n: number) {
    if (n > 0) kv.set(p === 'shake' ? K.invShake : K.invBomb, num(p === 'shake' ? K.invShake : K.invBomb) + n);
  },
  /** Takes one from the inventory; false if there was none. */
  takeInventory(p: PowerUpKind): boolean {
    const k = p === 'shake' ? K.invShake : K.invBomb;
    const have = num(k);
    if (have <= 0) return false;
    kv.set(k, have - 1);
    return true;
  },

  /** Purchase tokens already granted, so a replayed store event never grants twice. */
  hasGrantedToken: (token: string) => bool(K.granted(token), false),
  markGrantedToken: (token: string) => kv.set(K.granted(token), true),
};
