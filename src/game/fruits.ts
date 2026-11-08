/**
 * The merge chain. Edit radius / score / colors here to rebalance or re-theme.
 * Radii are in world units (the jar interior is WORLD.jarWidth units wide).
 */
export type FruitDef = {
  name: string;
  radius: number;
  score: number; // points awarded when this fruit is CREATED by a merge
  base: string; // main body color
  dark: string; // shadow side
  light: string; // lit side
  accent: string; // leaves / details
};

export const FRUITS: readonly FruitDef[] = [
  { name: 'Cherry', radius: 15, score: 1, base: '#E8273F', dark: '#9E0F28', light: '#FF7B8C', accent: '#4CAF50' },
  { name: 'Strawberry', radius: 21, score: 3, base: '#FF4560', dark: '#B81D3A', light: '#FF9AA8', accent: '#3DBE5A' },
  { name: 'Grape', radius: 28, score: 6, base: '#8E5BE8', dark: '#5328A6', light: '#C7A6FF', accent: '#6BBF59' },
  { name: 'Orange', radius: 34, score: 10, base: '#FF9F1C', dark: '#D96A00', light: '#FFD07A', accent: '#4CAF50' },
  { name: 'Persimmon', radius: 41, score: 15, base: '#FF7A2E', dark: '#C9450A', light: '#FFB27F', accent: '#5B8C2A' },
  { name: 'Apple', radius: 49, score: 21, base: '#F2334B', dark: '#A8172E', light: '#FF8A97', accent: '#58B947' },
  { name: 'Pear', radius: 57, score: 28, base: '#C9E04A', dark: '#8EA81C', light: '#EEFFA0', accent: '#7A5230' },
  { name: 'Peach', radius: 65, score: 36, base: '#FFB199', dark: '#F07A6A', light: '#FFE1D2', accent: '#68B84E' },
  { name: 'Pineapple', radius: 75, score: 45, base: '#FFD23F', dark: '#D9A300', light: '#FFF0A0', accent: '#2FA65A' },
  { name: 'Melon', radius: 87, score: 55, base: '#A8E07A', dark: '#6BAE3E', light: '#DDF7C4', accent: '#4E8F2A' },
  { name: 'Watermelon', radius: 100, score: 66, base: '#3FBF5A', dark: '#1F7F36', light: '#8BE69C', accent: '#155C27' },
];

export const MAX_LEVEL = FRUITS.length - 1;
/** Dropped fruits are drawn from levels [0, SPAWN_LEVELS). */
export const SPAWN_LEVELS = 5;
/** Bonus for two max-level fruits vanishing. */
export const VANISH_BONUS = 500;

export type MergeOutcome = { kind: 'merge'; level: number } | { kind: 'vanish' };

/** What happens when two fruits of `level` touch. */
export function mergeOutcome(level: number): MergeOutcome {
  if (level < 0 || level > MAX_LEVEL) throw new RangeError(`bad fruit level ${level}`);
  return level === MAX_LEVEL ? { kind: 'vanish' } : { kind: 'merge', level: level + 1 };
}
