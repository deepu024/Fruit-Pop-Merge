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
  daily: (date: string) => `daily.best.${date}`,
};

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

  getAdsRemoved: () => bool(K.adsRemoved, false),
  setAdsRemoved: (v: boolean) => kv.set(K.adsRemoved, v),
};
