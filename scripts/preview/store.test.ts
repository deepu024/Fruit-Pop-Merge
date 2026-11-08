/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * `npm run store` — Play Store graphics: 512px hi-res icon + 5 phone screenshots
 * (1080x1920, 9:16) built from real engine simulations rendered with the game's renderer.
 * Output: docs/store/
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(ROOT, 'docs', 'store');
const shim = require('./skia-shim.js');

let Skia: any;
let GameEngine: any;
let STEP_MS: number;
let WORLD: any;
let drawFrame: any;
let computeLayout: any;
let fruitPicture: any;
let ART_R: number;
let FRUITS: any[];

const W = 1080;
const H = 1920;
// the in-phone game view
const FW = 412;
const FH = 892;
const HUD = 88;

function save(surface: any, name: string) {
  surface.flush();
  fs.writeFileSync(path.join(OUT, name), Buffer.from(surface.makeImageSnapshot().encodeToBytes()));
}

const paint = (color: string, style = 0, width = 0) => {
  const p = Skia.Paint();
  p.setAntiAlias(true);
  p.setColor(Skia.Color(color));
  p.setStyle(style);
  if (width) p.setStrokeWidth(width);
  return p;
};

function text(cv: any, str: string, x: number, y: number, size: number, fill: string, stroke = '#4A2D5E', sw = 0) {
  const font = shim.matchFont({ fontSize: size });
  const w = font.measureText(str).width;
  if (sw) {
    const st = paint(stroke, 1, sw);
    st.setStrokeJoin(1);
    cv.drawText(str, x - w / 2, y + sw * 0.5, st, font);
    cv.drawText(str, x - w / 2, y, st, font);
  }
  cv.drawText(str, x - w / 2, y, paint(fill), font);
}

function backdrop(cv: any, colors: string[]) {
  const p = Skia.Paint();
  p.setShader(Skia.Shader.MakeLinearGradient({ x: 0, y: 0 }, { x: W * 0.5, y: H }, colors.map((c) => Skia.Color(c)), null, 0));
  cv.drawRect(Skia.XYWHRect(0, 0, W, H), p);
  const b = paint('rgba(255,255,255,0.22)');
  for (let i = 0; i < 18; i++) cv.drawCircle(((i * 0.379 + 0.1) % 1) * W, ((i * 0.617 + 0.2) % 1) * H, 10 + ((i * 7) % 5) * 9, b);
}

function caption(cv: any, l1: string, l2: string) {
  text(cv, l1, W / 2, 150, 92, '#FFFFFF', '#4A2D5E', 16);
  text(cv, l2, W / 2, 245, 52, '#FFC23D', '#4A2D5E', 7);
}

/** Phone-shaped card that the game frame is drawn into. Returns the inner transform. */
function phone(cv: any, draw: (cv: any) => void) {
  const scale = (H - 330 - 50) / FH;
  const pw = FW * scale;
  const x = (W - pw) / 2;
  const y = 330;
  const r = 44;
  cv.drawRRect(Skia.RRectXY(Skia.XYWHRect(x - 14, y - 14 + 16, pw + 28, FH * scale + 28), r + 10, r + 10), paint('rgba(60,20,80,0.25)'));
  cv.drawRRect(Skia.RRectXY(Skia.XYWHRect(x - 14, y - 14, pw + 28, FH * scale + 28), r + 10, r + 10), paint('#2B1630'));
  cv.save();
  cv.translate(x, y);
  cv.scale(scale, scale);
  const clip = Skia.PathBuilder.Make();
  clip.addRRect(Skia.RRectXY(Skia.XYWHRect(0, 0, FW, FH), r / scale, r / scale));
  cv.clipPath(clip.build(), 1, true);
  draw(cv);
  cv.restore();
}

function fruit(cv: any, level: number, x: number, y: number, r: number, face = 'open') {
  cv.save();
  cv.translate(x, y);
  cv.scale(r / ART_R, r / ART_R);
  cv.drawPicture(fruitPicture(level, face));
  cv.restore();
}

/** Mimics the React Native HUD (score, best, next bubble, power-ups) on top of the frame. */
function hud(cv: any, score: number, best: number, next: number) {
  text(cv, score.toLocaleString('en-US'), 70, 62, 34, '#FFFFFF', '#4A2D5E', 6);
  text(cv, `Best ${best.toLocaleString('en-US')}`, 62, 84, 13, '#4A2D5E');
  cv.drawCircle(FW / 2, 50, 26, paint('rgba(255,255,255,0.6)'));
  cv.drawCircle(FW / 2, 50, 26, paint('rgba(255,255,255,0.95)', 1, 2));
  fruit(cv, next, FW / 2, 52, 17);
  text(cv, 'NEXT', FW / 2, 90, 10, '#4A2D5E');
  cv.drawRRect(Skia.RRectXY(Skia.XYWHRect(FW - 60, 28, 44, 44), 14, 14), paint('rgba(255,255,255,0.7)'));
  cv.drawRRect(Skia.RRectXY(Skia.XYWHRect(FW - 45, 40, 5, 20), 2, 2), paint('#4A2D5E'));
  cv.drawRRect(Skia.RRectXY(Skia.XYWHRect(FW - 36, 40, 5, 20), 2, 2), paint('#4A2D5E'));
  const btn = (x: number, w: number, label: string, color: string) => {
    cv.drawRRect(Skia.RRectXY(Skia.XYWHRect(x, FH - 76, w, 44), 18, 18), paint(color));
    text(cv, label, x + w / 2, FH - 47, 17, '#FFFFFF');
  };
  btn(FW / 2 - 140, 120, 'Shake 1', '#3DBFA8');
  btn(FW / 2 + 0, 120, 'Bomb 1', '#FF9F1C');
}

function frame(cv: any, e: any, t: number) {
  drawFrame(cv, e, computeLayout(FW, FH, HUD, 108), t);
}

/** Auto-player: drops a fruit every `every` steps at a pseudo-random x. */
function autoplay(e: any, steps: number, every = 40, stop?: (e: any) => boolean) {
  let t = 0;
  for (let f = 0; f < steps; f++) {
    if (f % every === 0) {
      e.aim(WORLD.jarLeft + 40 + ((f * 73) % 320));
      e.drop();
    }
    e.tick(STEP_MS);
    t += STEP_MS;
    if (stop?.(e)) break;
  }
  return t;
}

beforeAll(async () => {
  await shim.__init();
  Skia = shim.Skia;
  fs.mkdirSync(OUT, { recursive: true });
  ({ GameEngine, STEP_MS, WORLD } = require('../../src/game/engine'));
  ({ drawFrame, computeLayout } = require('../../src/render/drawFrame'));
  ({ fruitPicture, ART_R } = require('../../src/render/fruitArt'));
  ({ FRUITS } = require('../../src/game/fruits'));
});

test('hi-res icon 512', () => {
  const S = 512;
  const surf = shim.__surface(S, S);
  const cv = surf.getCanvas();
  const p = Skia.Paint();
  p.setShader(Skia.Shader.MakeLinearGradient({ x: 0, y: 0 }, { x: S * 0.4, y: S }, ['#FFE7C7', '#FFC4D6', '#C9B6FF'].map((c) => Skia.Color(c)), [0, 0.55, 1], 0));
  cv.drawRect(Skia.XYWHRect(0, 0, S, S), p);
  const s = S * 0.78;
  fruit(cv, 10, S / 2, S / 2 + 12 + s * 0.06, s * 0.52);
  fruit(cv, 3, S / 2 + s * 0.4, S / 2 + 10 - s * 0.3, s * 0.2);
  fruit(cv, 2, S / 2 - s * 0.42, S / 2 + 10 - s * 0.26, s * 0.17);
  fruit(cv, 0, S / 2 - s * 0.36, S / 2 + 10 + s * 0.42, s * 0.14);
  save(surf, 'icon-512.png');
});

test('01 gameplay', () => {
  const surf = shim.__surface(W, H);
  const cv = surf.getCanvas();
  backdrop(cv, ['#FFD9A8', '#FF9EC0', '#B79CFF']);
  caption(cv, 'Drop. Merge. Pop!', 'Squishy fruit physics puzzle');
  const e = new GameEngine({ seed: 2024 });
  const t = autoplay(e, 1500);
  phone(cv, (c) => {
    frame(c, e, t);
    hud(c, e.score, e.score + 1240, e.nextLevel);
  });
  save(surf, 'screenshot-01-gameplay.png');
});

test('02 combo', () => {
  const surf = shim.__surface(W, H);
  const cv = surf.getCanvas();
  backdrop(cv, ['#FFE08A', '#FFB36B', '#FF7AA2']);
  caption(cv, 'Chain Combos!', 'Merge fast for huge multipliers');
  const e = new GameEngine({ seed: 77 });
  // play until a big combo is on screen, then catch it mid-animation
  const t = autoplay(e, 6000, 32, (en) => en.fx.combo.active && en.fx.combo.count >= 5 && en.fx.combo.t > 430);
  phone(cv, (c) => {
    frame(c, e, t);
    hud(c, e.score, e.score, e.nextLevel);
  });
  save(surf, 'screenshot-02-combo.png');
});

test('03 watermelon', () => {
  const surf = shim.__surface(W, H);
  const cv = surf.getCanvas();
  backdrop(cv, ['#C8F5B0', '#7FD8A0', '#5BB8C9']);
  caption(cv, 'Grow a Watermelon!', '11 fruits from Cherry to Watermelon');
  const e = new GameEngine({ seed: 5 });
  // a settled jar, then two melons rolling together
  const base = [1, 3, 2, 4, 0, 3, 1, 2];
  base.forEach((l, i) => e.debugSpawn(l, 50 + i * 45, 700));
  autoplay(e, 90, 1000);
  e.debugSpawn(9, 130, 440);
  e.debugSpawn(9, 310, 440);
  let t = 0;
  for (let i = 0; i < 400; i++) {
    e.tick(STEP_MS);
    t += STEP_MS;
    if (e.fruits.some((f: any) => f.level === 10 && f.popT >= 320) && e.fx.popups.every((q: any) => !q.active || q.t > 700)) break;
  }
  phone(cv, (c) => {
    frame(c, e, t);
    hud(c, e.score + 2860, e.score + 2860, 1);
  });
  save(surf, 'screenshot-03-watermelon.png');
});

test('04 collection', () => {
  const surf = shim.__surface(W, H);
  const cv = surf.getCanvas();
  backdrop(cv, ['#FFE7C7', '#FFC4D6', '#C9B6FF']);
  caption(cv, 'Collect Them All', 'Discover every cute fruit');
  phone(cv, (c) => {
    const p = Skia.Paint();
    p.setShader(Skia.Shader.MakeLinearGradient({ x: 0, y: 0 }, { x: FW * 0.4, y: FH }, ['#FFE7C7', '#FFC4D6', '#C9B6FF'].map((x) => Skia.Color(x)), null, 0));
    c.drawRect(Skia.XYWHRect(0, 0, FW, FH), p);
    text(c, 'Collection', FW / 2, 80, 34, '#FFFFFF', '#4A2D5E', 6);
    text(c, '8 / 11 discovered', FW / 2, 108, 14, '#4A2D5E');
    const cell = 118;
    const sil = Skia.Paint();
    sil.setColorFilter(Skia.ColorFilter.MakeBlend(Skia.Color('rgba(74,45,94,0.5)'), 5));
    FRUITS.forEach((f: any, i: number) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = 30 + col * (cell + 8);
      const y = 130 + row * (cell + 30);
      c.drawRRect(Skia.RRectXY(Skia.XYWHRect(x, y, cell, cell + 22), 18, 18), paint('rgba(255,255,255,0.55)'));
      const locked = i >= 8;
      if (locked) c.saveLayer(sil);
      fruit(c, i, x + cell / 2, y + cell / 2 + 4, 38, i === 4 ? 'happy' : 'open');
      if (locked) c.restore();
      text(c, locked ? '???' : f.name, x + cell / 2, y + cell + 6, 14, '#4A2D5E');
    });
  });
  save(surf, 'screenshot-04-collection.png');
});

test('05 daily', () => {
  const surf = shim.__surface(W, H);
  const cv = surf.getCanvas();
  backdrop(cv, ['#D7F5FF', '#B9A8FF', '#FF9EC0']);
  caption(cv, 'Daily Challenge', 'Same fruits for everyone, every day');
  const e = new GameEngine({ seed: 99 });
  const t = autoplay(e, 2600, 36);
  phone(cv, (c) => {
    frame(c, e, t);
    c.drawRect(Skia.XYWHRect(0, 0, FW, FH), paint('rgba(40,20,60,0.45)'));
    const px = 46;
    const pw = FW - px * 2;
    c.drawRRect(Skia.RRectXY(Skia.XYWHRect(px, 250, pw, 330), 30, 30), paint('rgba(255,255,255,0.96)'));
    text(c, 'Daily Over', FW / 2, 300, 30, '#4A2D5E');
    text(c, '4,820', FW / 2, 370, 54, '#FF7AA2');
    text(c, 'New best!', FW / 2, 410, 20, '#FFC23D', '#4A2D5E', 4);
    const btn = (y: number, label: string, color: string) => {
      c.drawRRect(Skia.RRectXY(Skia.XYWHRect(px + 30, y, pw - 60, 48), 22, 22), paint(color));
      text(c, label, FW / 2, y + 32, 20, '#FFFFFF');
    };
    btn(440, 'Restart', '#FF7AA2');
    btn(500, 'Home', '#9A86C9');
  });
  save(surf, 'screenshot-05-daily.png');
});
