import { useEffect, useState } from 'react';

import { easeOutCubic } from '../game/easing';

/** Animates a number from 0 to `target` (UI only; never used during gameplay). */
export function useCountUp(target: number, duration = 900, delay = 250) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = Date.now() + delay;
    const tick = () => {
      const k = (Date.now() - start) / duration;
      setV(Math.round(target * easeOutCubic(Math.max(0, k))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, delay]);
  return v;
}
