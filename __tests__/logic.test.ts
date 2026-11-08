import { FRUITS, MAX_LEVEL, mergeOutcome, VANISH_BONUS } from '../src/game/fruits';
import { dailySeed, dateKey, hashString, mulberry32 } from '../src/game/rng';
import { COMBO_WINDOW_MS, ComboTracker, MAX_MULTIPLIER, mergePoints, shouldShowInterstitial } from '../src/game/scoring';
import { SPAWN_WEIGHTS, Spawner } from '../src/game/spawner';

describe('merge chain', () => {
  it('has 11 fruits ending in Watermelon', () => {
    expect(FRUITS).toHaveLength(11);
    expect(FRUITS[0].name).toBe('Cherry');
    expect(FRUITS[MAX_LEVEL].name).toBe('Watermelon');
  });

  it('radii and scores strictly increase', () => {
    for (let i = 1; i < FRUITS.length; i++) {
      expect(FRUITS[i].radius).toBeGreaterThan(FRUITS[i - 1].radius);
      expect(FRUITS[i].score).toBeGreaterThan(FRUITS[i - 1].score);
    }
  });

  it('merges each level into the next', () => {
    for (let i = 0; i < MAX_LEVEL; i++) expect(mergeOutcome(i)).toEqual({ kind: 'merge', level: i + 1 });
  });

  it('two watermelons vanish', () => {
    expect(mergeOutcome(MAX_LEVEL)).toEqual({ kind: 'vanish' });
  });

  it('rejects invalid levels', () => {
    expect(() => mergeOutcome(-1)).toThrow();
    expect(() => mergeOutcome(MAX_LEVEL + 1)).toThrow();
  });
});

describe('scoring', () => {
  it('awards the created fruit score times multiplier', () => {
    expect(mergePoints(0, 1)).toBe(FRUITS[1].score);
    expect(mergePoints(3, 2)).toBe(FRUITS[4].score * 2);
  });

  it('caps the multiplier', () => {
    expect(mergePoints(0, 99)).toBe(FRUITS[1].score * MAX_MULTIPLIER);
    expect(mergePoints(0, 0)).toBe(FRUITS[1].score);
  });

  it('gives the vanish bonus for watermelons', () => {
    expect(mergePoints(MAX_LEVEL, 1)).toBe(VANISH_BONUS);
  });
});

describe('combo timer', () => {
  it('chains merges within the window', () => {
    const c = new ComboTracker();
    expect(c.hit(0)).toBe(1);
    expect(c.hit(1000)).toBe(2);
    expect(c.hit(1000 + COMBO_WINDOW_MS)).toBe(3);
    expect(c.multiplier).toBe(3);
  });

  it('resets after the window', () => {
    const c = new ComboTracker();
    c.hit(0);
    c.hit(500);
    expect(c.hit(500 + COMBO_WINDOW_MS + 1)).toBe(1);
  });

  it('update() expires the chain and remaining() counts down', () => {
    const c = new ComboTracker();
    c.hit(0);
    expect(c.remaining(COMBO_WINDOW_MS / 2)).toBeCloseTo(0.5);
    c.update(COMBO_WINDOW_MS + 1);
    expect(c.count).toBe(0);
    expect(c.multiplier).toBe(1);
  });
});

describe('seeded rng', () => {
  it('is deterministic per seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 100; i++) expect(a()).toBe(b());
  });

  it('differs across seeds and stays in [0,1)', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    let same = 0;
    for (let i = 0; i < 100; i++) {
      const x = a();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
      if (x === b()) same++;
    }
    expect(same).toBeLessThan(3);
  });

  it('daily seed depends only on the local date', () => {
    const d1 = new Date(2026, 10, 8, 1, 0);
    const d2 = new Date(2026, 10, 8, 23, 59);
    const d3 = new Date(2026, 10, 9, 0, 1);
    expect(dateKey(d1)).toBe('2026-11-08');
    expect(dailySeed(d1)).toBe(dailySeed(d2));
    expect(dailySeed(d1)).not.toBe(dailySeed(d3));
    expect(hashString('abc')).toBe(hashString('abc'));
  });

  it('daily spawner sequence is reproducible and within spawn levels', () => {
    const s1 = new Spawner(mulberry32(dailySeed(new Date(2026, 0, 1))));
    const s2 = new Spawner(mulberry32(dailySeed(new Date(2026, 0, 1))));
    const seq1 = Array.from({ length: 50 }, () => s1.take());
    const seq2 = Array.from({ length: 50 }, () => s2.take());
    expect(seq1).toEqual(seq2);
    for (const l of seq1) expect(l).toBeLessThan(SPAWN_WEIGHTS.length);
  });

  it('peek/peekNext match subsequent takes', () => {
    const s = new Spawner(mulberry32(7));
    const p1 = s.peek();
    const p2 = s.peekNext();
    expect(s.take()).toBe(p1);
    expect(s.take()).toBe(p2);
  });
});

describe('interstitial pacing', () => {
  const show = (n: number) => shouldShowInterstitial(n, 3, 2, false);
  it('never in first two games, then every third', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9].map(show)).toEqual([false, false, true, false, false, true, false, false, true]);
  });
  it('never when ads are removed', () => {
    expect(shouldShowInterstitial(3, 3, 2, true)).toBe(false);
  });
});
