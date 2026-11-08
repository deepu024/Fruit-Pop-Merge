import { SPAWN_LEVELS } from './fruits';
import type { Rng } from './rng';

/** Relative odds for spawn levels 0..4 (smaller fruits more common). */
export const SPAWN_WEIGHTS = [30, 26, 20, 14, 10];

/**
 * Produces the sequence of dropped fruits. Deterministic for a given RNG, so the
 * daily challenge gives every player the same sequence on the same date.
 */
export class Spawner {
  private queue: number[] = [];

  constructor(private rng: Rng) {
    this.queue.push(this.roll(), this.roll());
  }

  private roll(): number {
    const total = SPAWN_WEIGHTS.slice(0, SPAWN_LEVELS).reduce((a, b) => a + b, 0);
    let r = this.rng() * total;
    for (let i = 0; i < SPAWN_LEVELS; i++) {
      r -= SPAWN_WEIGHTS[i];
      if (r < 0) return i;
    }
    return 0;
  }

  /** The fruit that will be handed to the player next. */
  peek(): number {
    return this.queue[0];
  }

  /** The fruit after that (shown in the preview bubble). */
  peekNext(): number {
    return this.queue[1];
  }

  take(): number {
    const level = this.queue.shift()!;
    this.queue.push(this.roll());
    return level;
  }
}
