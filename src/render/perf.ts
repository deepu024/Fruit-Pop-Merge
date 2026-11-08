/**
 * Lightweight frame profiler. Collects frame interval + JS work time per frame and
 * logs a summary every 5 s in dev builds (see README "Profiling").
 */
const WINDOW = 300;
const intervals = new Float32Array(WINDOW);
const work = new Float32Array(WINDOW);
let n = 0;
let lastLog = 0;

export const perf = {
  enabled: __DEV__,
  frame(dt: number, workMs: number) {
    if (!perf.enabled) return;
    intervals[n % WINDOW] = dt;
    work[n % WINDOW] = workMs;
    n++;
    const now = Date.now();
    if (now - lastLog > 5000 && n >= WINDOW) {
      lastLog = now;
      console.log('[perf]', perf.summary());
    }
  },
  summary() {
    const count = Math.min(n, WINDOW);
    if (!count) return null;
    const iv = Array.from(intervals.slice(0, count)).sort((a, b) => a - b);
    const wk = Array.from(work.slice(0, count)).sort((a, b) => a - b);
    const avg = iv.reduce((a, b) => a + b, 0) / count;
    return {
      fps: Math.round(1000 / avg),
      p95FrameMs: +iv[Math.floor(count * 0.95)].toFixed(1),
      jank: iv.filter((x) => x > 25).length, // frames that missed 40 fps
      avgJsWorkMs: +(wk.reduce((a, b) => a + b, 0) / count).toFixed(2),
      p95JsWorkMs: +wk[Math.floor(count * 0.95)].toFixed(2),
    };
  },
};
