import { matchFont, PaintStyle, Skia, StrokeCap, TileMode, type SkCanvas, type SkFont, type SkPaint, type SkShader } from '@shopify/react-native-skia';
import { Platform } from 'react-native';

import { theme } from '../config/theme';
import { clamp01, easeOutBack, easeOutCubic, easeOutElastic } from '../game/easing';
import { POP_MS, WORLD, type GameEngine } from '../game/engine';
import { FRUITS } from '../game/fruits';
import { ART_R, fruitPicture } from './fruitArt';

export type Layout = { width: number; height: number; scale: number; ox: number; oy: number };

/** Fit the world into the area between the top HUD and bottom bar, centered. */
export function computeLayout(width: number, height: number, top: number, bottom: number): Layout {
  const availH = height - top - bottom;
  const scale = Math.min(width / WORLD.width, availH / WORLD.height);
  return { width, height, scale, ox: (width - WORLD.width * scale) / 2, oy: top + (availH - WORLD.height * scale) / 2 };
}

export function screenToWorld(l: Layout, x: number, y: number) {
  return { x: (x - l.ox) / l.scale, y: (y - l.oy) / l.scale };
}

// ---------------------------------------------------------------- reusable paints
// Allocated once; mutated per draw call. No per-frame Paint allocations.
let P: ReturnType<typeof makePaints> | null = null;
function makePaints() {
  const mk = (style = PaintStyle.Fill) => {
    const p = Skia.Paint();
    p.setAntiAlias(true);
    p.setStyle(style);
    return p;
  };
  const dash = mk(PaintStyle.Stroke);
  dash.setStrokeWidth(3);
  dash.setStrokeCap(StrokeCap.Round);
  dash.setPathEffect(Skia.PathEffect.MakeDash([12, 10], 0));
  const dots = mk(PaintStyle.Stroke);
  dots.setStrokeWidth(4);
  dots.setStrokeCap(StrokeCap.Round);
  dots.setPathEffect(Skia.PathEffect.MakeDash([0.1, 14], 0));
  const stroke = mk(PaintStyle.Stroke);
  stroke.setStrokeCap(StrokeCap.Round);
  const fontFamily = Platform.select({ android: 'sans-serif', default: 'Helvetica' });
  return {
    fill: mk(),
    bg: mk(),
    stroke,
    dash,
    dots,
    pic: mk(),
    text: mk(),
    textStroke: (() => {
      const p = mk(PaintStyle.Stroke);
      p.setStrokeWidth(5);
      p.setColor(Skia.Color('#4A2D5E'));
      return p;
    })(),
    font: matchFont({ fontFamily, fontSize: 26, fontWeight: 'bold' }) as SkFont,
    bigFont: matchFont({ fontFamily, fontSize: 44, fontWeight: 'bold' }) as SkFont,
  };
}

const colorCache = new Map<string, ReturnType<typeof Skia.Color>>();
function col(s: string) {
  let v = colorCache.get(s);
  if (!v) colorCache.set(s, (v = Skia.Color(s)));
  return v;
}

function setFill(p: SkPaint, color: string, alpha = 1) {
  p.setColor(col(color));
  p.setAlphaf(alpha);
}

// ---------------------------------------------------------------- background
type Bubble = { x: number; y: number; r: number; speed: number; phase: number };
const bubbles: Bubble[] = Array.from({ length: 14 }, (_, i) => ({
  x: Math.random(),
  y: Math.random(),
  r: 4 + Math.random() * 14,
  speed: 0.015 + Math.random() * 0.03,
  phase: i * 1.7,
}));

function lerpColor(a: string, b: string, t: number) {
  const ca = col(a);
  const cb = col(b);
  return Float32Array.of(ca[0] + (cb[0] - ca[0]) * t, ca[1] + (cb[1] - ca[1]) * t, ca[2] + (cb[2] - ca[2]) * t, 1);
}

let bgShader: SkShader | null = null;
let bgFrame = 0;

function drawBackground(cv: SkCanvas, l: Layout, t: number) {
  const p = P!;
  // gradient is rebuilt only every 8th frame — it drifts slowly, so nobody can tell
  if (!bgShader || bgFrame++ % 8 === 0) {
    const k = (Math.sin(t * 0.15) + 1) / 2;
    const colors = theme.bgA.map((a, i) => lerpColor(a, theme.bgB[i], k));
    bgShader = Skia.Shader.MakeLinearGradient({ x: 0, y: 0 }, { x: l.width * 0.4, y: l.height }, colors, [0, 0.55, 1], TileMode.Clamp);
  }
  p.bg.setShader(bgShader);
  cv.drawRect(Skia.XYWHRect(0, 0, l.width, l.height), p.bg);

  for (const b of bubbles) {
    const y = (((b.y - t * b.speed) % 1) + 1) % 1;
    const x = b.x * l.width + Math.sin(t * 0.8 + b.phase) * 12;
    setFill(p.fill, theme.bubble, 0.18);
    cv.drawCircle(x, y * (l.height + 40) - 20, b.r, p.fill);
    setFill(p.fill, theme.bubble, 0.35);
    cv.drawCircle(x - b.r * 0.35, y * (l.height + 40) - 20 - b.r * 0.35, b.r * 0.25, p.fill);
  }
}

// ---------------------------------------------------------------- jar
function drawJarBack(cv: SkCanvas) {
  const p = P!;
  const { jarLeft: L, jarRight: R, jarTop: T, jarBottom: B } = WORLD;
  setFill(p.fill, theme.jarShadow, 1);
  cv.drawRRect(Skia.RRectXY(Skia.XYWHRect(L - 6, T + 14, R - L + 12, B - T + 6), 28, 28), p.fill);
  setFill(p.fill, '#FFFFFF', 0.2);
  cv.drawRRect(Skia.RRectXY(Skia.XYWHRect(L - 8, T, R - L + 16, B - T + 8), 26, 26), p.fill);
}

function drawJarFront(cv: SkCanvas) {
  const p = P!;
  const { jarLeft: L, jarRight: R, jarTop: T, jarBottom: B } = WORLD;
  p.stroke.setStrokeWidth(8);
  setFill(p.stroke, theme.jarEdge, 0.9);
  const path = Skia.PathBuilder.Make();
  path.moveTo(L - 4, T);
  path.lineTo(L - 4, B - 18);
  path.quadTo(L - 4, B + 4, L + 18, B + 4);
  path.lineTo(R - 18, B + 4);
  path.quadTo(R + 4, B + 4, R + 4, B - 18);
  path.lineTo(R + 4, T);
  cv.drawPath(path.build(), p.stroke);
  // rim + glass glints
  p.stroke.setStrokeWidth(10);
  cv.drawLine(L - 14, T, L + 6, T, p.stroke);
  cv.drawLine(R - 6, T, R + 14, T, p.stroke);
  p.stroke.setStrokeWidth(6);
  setFill(p.stroke, '#FFFFFF', 0.35);
  cv.drawLine(L + 14, T + 40, L + 14, B - 60, p.stroke);
  p.stroke.setStrokeWidth(3);
  cv.drawLine(R - 16, T + 60, R - 16, T + 160, p.stroke);
}

// ---------------------------------------------------------------- fruit
function drawFruitAt(cv: SkCanvas, level: number, x: number, y: number, angle: number, scale: number, blink: boolean, sq = 0, sqAngle = 0, alpha = 1) {
  const s = (FRUITS[level].radius / ART_R) * scale;
  cv.save();
  cv.translate(x, y);
  if (sq !== 0) {
    // squash along the impact normal, stretch perpendicular to it
    const deg = (sqAngle * 180) / Math.PI;
    cv.rotate(deg, 0, 0);
    cv.scale(1 - sq, 1 + sq * 0.6);
    cv.rotate(-deg, 0, 0);
  }
  cv.rotate((angle * 180) / Math.PI, 0, 0);
  cv.scale(s, s);
  if (alpha < 1) {
    const p = P!.pic;
    p.setAlphaf(alpha);
    cv.saveLayer(p);
    cv.drawPicture(fruitPicture(level, blink));
    cv.restore();
  } else {
    cv.drawPicture(fruitPicture(level, blink));
  }
  cv.restore();
}

function drawText(cv: SkCanvas, text: string, x: number, y: number, font: SkFont, size: number, color: string, alpha: number) {
  const p = P!;
  const k = size / font.getSize();
  const w = font.measureText(text).width;
  cv.save();
  cv.translate(x, y);
  cv.scale(k, k);
  p.textStroke.setAlphaf(alpha * 0.9);
  cv.drawText(text, -w / 2, 0, p.textStroke, font);
  setFill(p.text, color, alpha);
  cv.drawText(text, -w / 2, 0, p.text, font);
  cv.restore();
}

// ---------------------------------------------------------------- frame
export function drawFrame(cv: SkCanvas, e: GameEngine, l: Layout, timeMs: number) {
  if (!P) P = makePaints();
  const p = P;
  const t = timeMs / 1000;
  drawBackground(cv, l, t);

  cv.save();
  const sx = e.shake ? (Math.sin(timeMs * 0.09) + Math.sin(timeMs * 0.051)) * e.shake * 0.5 : 0;
  const sy = e.shake ? Math.cos(timeMs * 0.077) * e.shake * 0.5 : 0;
  cv.translate(l.ox + sx * l.scale, l.oy + sy * l.scale);
  cv.scale(l.scale, l.scale);

  drawJarBack(cv);

  // danger line: faint normally, pulsing red while the game-over timer runs
  const pulse = e.dangerLevel > 0 ? 0.5 + 0.5 * Math.sin(timeMs * (0.012 + e.dangerLevel * 0.02)) : 0;
  if (e.dangerLevel > 0) {
    setFill(p.fill, theme.dangerLine, 0.1 + 0.18 * pulse);
    cv.drawRect(Skia.XYWHRect(WORLD.jarLeft, WORLD.jarTop - 30, WORLD.jarRight - WORLD.jarLeft, WORLD.dangerY - WORLD.jarTop + 30), p.fill);
  }
  setFill(p.dash, e.dangerLevel > 0 ? theme.dangerLine : '#FFFFFF', e.dangerLevel > 0 ? 0.6 + 0.4 * pulse : 0.55);
  cv.drawLine(WORLD.jarLeft + 6, WORLD.dangerY, WORLD.jarRight - 6, WORLD.dangerY, p.dash);

  // held fruit + guide
  const h = e.held;
  const ready = e.now >= h.readyAt && !e.gameOver;
  if (ready) {
    const appear = clamp01((e.now - h.readyAt) / 260);
    const bob = Math.sin(t * 3.2) * 3;
    const hy = WORLD.spawnY + bob;
    const alpha = e.bombArmed ? 0.35 : 1;
    setFill(p.dots, theme.guideLine, 0.8 * appear * alpha);
    cv.drawLine(h.x, hy + FRUITS[h.level].radius + 10, h.x, WORLD.jarBottom - 6, p.dots);
    const blink = Math.sin(t * 0.7) > 0.985;
    drawFruitAt(cv, h.level, h.x, hy, Math.sin(t * 1.6) * 0.08, easeOutBack(appear), blink, 0, 0, alpha);
  }

  // fruits
  for (const f of e.fruits) {
    const pos = f.body.position;
    const pop = f.popT < POP_MS ? 0.25 + 0.75 * easeOutBack(f.popT / POP_MS, 3) : 1;
    const sq = f.squash ? f.squash * Math.exp(-f.squashT / 140) * Math.cos(f.squashT / 32) : 0;
    drawFruitAt(cv, f.level, pos.x, pos.y, f.body.angle, pop, f.blinkT > 0, Math.abs(sq) > 0.004 ? sq : 0, f.squashAngle);
  }

  const fx = e.fx;
  // merging fruits shrinking into each other
  for (const g of fx.ghosts) {
    if (!g.active) continue;
    const k = easeOutCubic(g.t / g.dur);
    drawFruitAt(cv, g.level, g.x0 + (g.x1 - g.x0) * k, g.y0 + (g.y1 - g.y0) * k, g.angle, 1 - 0.6 * k, false, 0, 0, 1 - k * 0.7);
  }

  // shockwave rings
  for (const r of fx.rings) {
    if (!r.active) continue;
    const k = r.t / r.dur;
    p.stroke.setStrokeWidth(10 * (1 - k) + 1);
    setFill(p.stroke, r.color, 0.85 * (1 - k));
    cv.drawCircle(r.x, r.y, r.r * (0.35 + 0.65 * easeOutCubic(k)), p.stroke);
  }

  // particles
  for (const q of fx.particles) {
    if (!q.active) continue;
    const k = q.life / q.maxLife;
    setFill(p.fill, q.color, Math.min(1, k * 1.6));
    cv.drawCircle(q.x, q.y, q.size * (0.4 + 0.6 * k), p.fill);
  }

  drawJarFront(cv);

  // score popups
  for (const s of fx.popups) {
    if (!s.active) continue;
    const k = s.t / s.dur;
    const scale = k < 0.15 ? easeOutBack(k / 0.15) : 1;
    drawText(cv, s.text, s.x, s.y - easeOutCubic(k) * 60, p.font, s.size * scale, s.color, 1 - clamp01((k - 0.6) / 0.4));
  }

  // combo banner
  if (fx.combo.active) {
    const k = fx.combo.t / fx.combo.dur;
    const scale = easeOutElastic(Math.min(1, k * 2.2));
    const alpha = 1 - clamp01((k - 0.75) / 0.25);
    cv.save();
    cv.translate(WORLD.width / 2, WORLD.jarTop + 70);
    cv.rotate(-6 + Math.sin(k * 12) * 2, 0, 0);
    drawText(cv, fx.combo.text, 0, 0, p.bigFont, 44 * scale, theme.gold, alpha);
    cv.restore();
  }

  cv.restore();
}
