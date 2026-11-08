/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * `npm run assets` — draws the app icon, adaptive icon layers, splash image and the
 * Play Store feature graphic from the same procedural fruit art the game uses.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..', '..');
const shim = require('./skia-shim.js');

let Skia: any;
let fruitPicture: (level: number) => any;
let ART_R: number;

function save(surface: any, rel: string) {
  surface.flush();
  const file = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.from(surface.makeImageSnapshot().encodeToBytes()));
}

function gradient(cv: any, w: number, h: number) {
  const p = Skia.Paint();
  p.setShader(
    Skia.Shader.MakeLinearGradient({ x: 0, y: 0 }, { x: w * 0.4, y: h }, ['#FFE7C7', '#FFC4D6', '#C9B6FF'].map((c) => Skia.Color(c)), [0, 0.55, 1], 0),
  );
  cv.drawRect(Skia.XYWHRect(0, 0, w, h), p);
}

function bubbles(cv: any, w: number, h: number, n: number) {
  const p = Skia.Paint();
  p.setAntiAlias(true);
  p.setColor(Skia.Color('rgba(255,255,255,0.28)'));
  for (let i = 0; i < n; i++) {
    const x = ((i * 0.379 + 0.13) % 1) * w;
    const y = ((i * 0.617 + 0.21) % 1) * h;
    cv.drawCircle(x, y, (0.012 + ((i * 7) % 5) * 0.006) * Math.min(w, h), p);
  }
}

/** Draws fruit `level` centred at (x,y) with on-screen radius r. */
function fruit(cv: any, level: number, x: number, y: number, r: number, rotDeg = 0) {
  cv.save();
  cv.translate(x, y);
  cv.rotate(rotDeg, 0, 0);
  cv.scale(r / ART_R, r / ART_R);
  cv.drawPicture(fruitPicture(level));
  cv.restore();
}

/** The hero cluster: watermelon with a cherry, grape and orange tumbling around it. */
function cluster(cv: any, cx: number, cy: number, s: number) {
  fruit(cv, 10, cx, cy + s * 0.06, s * 0.52);
  fruit(cv, 3, cx + s * 0.4, cy - s * 0.3, s * 0.2, 12);
  fruit(cv, 2, cx - s * 0.42, cy - s * 0.26, s * 0.17, -14);
  fruit(cv, 0, cx - s * 0.36, cy + s * 0.42, s * 0.14, -8);
}

function text(cv: any, str: string, x: number, y: number, size: number, fill: string, strokeW: number) {
  const font = shim.matchFont({ fontSize: size });
  const w = font.measureText(str).width;
  const st = Skia.Paint();
  st.setAntiAlias(true);
  st.setStyle(1);
  st.setStrokeWidth(strokeW);
  st.setStrokeJoin(1);
  st.setColor(Skia.Color('#4A2D5E'));
  cv.drawText(str, x - w / 2, y + strokeW * 0.6, st, font); // drop shadow
  cv.drawText(str, x - w / 2, y, st, font);
  const f = Skia.Paint();
  f.setAntiAlias(true);
  f.setColor(Skia.Color(fill));
  cv.drawText(str, x - w / 2, y, f, font);
}

beforeAll(async () => {
  await shim.__init();
  Skia = shim.Skia;
  ({ fruitPicture, ART_R } = require('../../src/render/fruitArt'));
});

test('app icon (1024, full bleed)', () => {
  const S = 1024;
  const surf = shim.__surface(S, S);
  const cv = surf.getCanvas();
  gradient(cv, S, S);
  bubbles(cv, S, S, 14);
  cluster(cv, S / 2, S / 2 + 20, S * 0.78);
  save(surf, 'assets/icon.png');
});

test('adaptive icon layers (1024; art inside the 66% safe zone)', () => {
  const S = 1024;
  const fg = shim.__surface(S, S);
  cluster(fg.getCanvas(), S / 2, S / 2 + 12, S * 0.52);
  save(fg, 'assets/android-icon-foreground.png');

  const bg = shim.__surface(S, S);
  gradient(bg.getCanvas(), S, S);
  bubbles(bg.getCanvas(), S, S, 10);
  save(bg, 'assets/android-icon-background.png');

  // monochrome (Android 13 themed icons): white silhouette of the foreground
  const mono = shim.__surface(S, S);
  const cv = mono.getCanvas();
  const layer = Skia.Paint();
  layer.setColorFilter(Skia.ColorFilter.MakeBlend(Skia.Color('#FFFFFF'), 5 /* SrcIn */));
  cv.saveLayer(layer);
  cluster(cv, S / 2, S / 2 + 12, S * 0.52);
  cv.restore();
  save(mono, 'assets/android-icon-monochrome.png');
});

test('splash image (transparent, shown on the splash background color)', () => {
  const S = 1024;
  const surf = shim.__surface(S, S);
  cluster(surf.getCanvas(), S / 2, S / 2, S * 0.9);
  save(surf, 'assets/splash-icon.png');
});

test('feature graphic (1024x500)', () => {
  const W = 1024;
  const H = 500;
  const surf = shim.__surface(W, H);
  const cv = surf.getCanvas();
  gradient(cv, W, H);
  bubbles(cv, W, H, 16);
  // fruit pile on the left
  fruit(cv, 10, 190, 330, 150);
  fruit(cv, 8, 360, 400, 95, 8);
  fruit(cv, 5, 90, 150, 70, -10);
  fruit(cv, 3, 330, 220, 55, 14);
  fruit(cv, 1, 250, 120, 36, -6);
  fruit(cv, 0, 430, 270, 28, 10);
  // shockwave ring around the watermelon
  const ring = Skia.Paint();
  ring.setAntiAlias(true);
  ring.setStyle(1);
  ring.setStrokeWidth(8);
  ring.setColor(Skia.Color('rgba(255,243,160,0.85)'));
  cv.drawCircle(190, 330, 175, ring);
  text(cv, 'Fruit', 735, 220, 112, '#FFFFFF', 14);
  text(cv, 'Pop Merge', 735, 340, 92, '#FFC23D', 13);
  save(surf, 'docs/store/feature-graphic.png');
});
