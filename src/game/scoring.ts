import { FRUITS, MAX_LEVEL, VANISH_BONUS } from './fruits';

export const COMBO_WINDOW_MS = 1500;
export const MAX_MULTIPLIER = 5;
/** Combo count at which a power-up is awarded (once per chain). */
export const COMBO_POWERUP_AT = 4;

/** Points for a merge of two fruits of `level` at combo multiplier `mult`. */
export function mergePoints(level: number, mult: number): number {
  const base = level === MAX_LEVEL ? VANISH_BONUS : FRUITS[level + 1].score;
  return base * Math.max(1, Math.min(MAX_MULTIPLIER, Math.floor(mult)));
}

/**
 * Tracks merge chains. Every merge within COMBO_WINDOW_MS of the previous one
 * increases the chain; the multiplier is the chain length, capped.
 */
export class ComboTracker {
  count = 0;
  private lastAt = -Infinity;

  /** Register a merge at time `now` (ms). Returns the new combo count. */
  hit(now: number): number {
    this.count = now - this.lastAt <= COMBO_WINDOW_MS ? this.count + 1 : 1;
    this.lastAt = now;
    return this.count;
  }

  /** Call every tick; drops the chain once the window has elapsed. */
  update(now: number): void {
    if (this.count > 0 && now - this.lastAt > COMBO_WINDOW_MS) this.count = 0;
  }

  get multiplier(): number {
    return Math.max(1, Math.min(MAX_MULTIPLIER, this.count));
  }

  /** 0..1 remaining time in the current window (for UI). */
  remaining(now: number): number {
    if (this.count === 0) return 0;
    return Math.max(0, 1 - (now - this.lastAt) / COMBO_WINDOW_MS);
  }

  reset(): void {
    this.count = 0;
    this.lastAt = -Infinity;
  }
}

/** Interstitial pacing rule: every `every`th game over, never within the first `minGames`. */
export function shouldShowInterstitial(gameOverNumber: number, every: number, minGames: number, adsRemoved: boolean): boolean {
  if (adsRemoved) return false;
  if (gameOverNumber <= minGames) return false;
  return gameOverNumber % every === 0;
}
