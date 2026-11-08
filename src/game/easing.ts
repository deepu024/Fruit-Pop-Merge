export const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);

/** Overshoots ~10% then settles: used for the merge pop-in. */
export function easeOutBack(t: number, s = 2.2): number {
  const u = clamp01(t) - 1;
  return 1 + u * u * ((s + 1) * u + s);
}

export function easeOutElastic(t: number): number {
  t = clamp01(t);
  if (t === 0 || t === 1) return t;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
}

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);
export const easeInQuad = (t: number) => clamp01(t) * clamp01(t);
