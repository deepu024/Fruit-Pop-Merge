/* eslint-disable @typescript-eslint/no-require-imports */
import fs from 'fs';
import path from 'path';

const OUT = path.join(__dirname, '..', '..', 'docs', 'preview');
const shim = require('./skia-shim.js');

function save(surface: any, name: string) {
  surface.flush();
  const png = surface.makeImageSnapshot().encodeToBytes();
  fs.writeFileSync(path.join(OUT, name), Buffer.from(png));
}

beforeAll(async () => {
  await shim.__init();
  fs.mkdirSync(OUT, { recursive: true });
});

test('fruit sheet', () => {
  const { fruitPicture, ART_R } = require('../../src/render/fruitArt');
  const { FRUITS } = require('../../src/game/fruits');
  const cell = 160;
  const surface = shim.__surface(cell * 6, cell * 6);
  const cv = surface.getCanvas();
  cv.clear(shim.Skia.Color('#FFE3EE'));
  FRUITS.forEach((_: unknown, i: number) => {
    for (const face of ['open', 'blink', 'happy', 'scared'] as const) {
      const row = ['open', 'blink', 'happy', 'scared'].indexOf(face);
      if (row > 0 && i > 5) return;
      const idx = row === 0 ? i : 6 + row * 6 + i;
      cv.save();
      cv.translate((idx % 6) * cell + cell / 2, Math.floor(idx / 6) * cell + cell / 2 + 8);
      const s = (cell * 0.36) / ART_R;
      cv.scale(s, s);
      cv.drawPicture(fruitPicture(i, face));
      cv.restore();
    }
  });
  save(surface, 'fruits.png');
});

test('simulated gameplay frames', () => {
  const { GameEngine, STEP_MS } = require('../../src/game/engine');
  const { drawFrame, computeLayout } = require('../../src/render/drawFrame');
  const W = 412;
  const H = 892;
  const layout = computeLayout(W, H, 24 + 64, 24 + 84);
  const e = new GameEngine({ seed: 12345 });
  let t = 0;
  const xs = [100, 300, 200, 150, 260, 90, 330, 210, 180, 240];
  const frameTimes: number[] = [];
  const shots: Record<number, string> = { 900: 'frame-early.png', 2400: 'frame-mid.png', 4200: 'frame-late.png' };
  for (let f = 0; f <= 4200; f++) {
    if (f % 40 === 0) {
      e.aim(xs[(f / 40) % xs.length] + ((f * 7) % 40));
      e.drop();
    }
    const t0 = performance.now();
    e.tick(STEP_MS);
    t += STEP_MS;
    const want = shots[f];
    if (want || f % 60 === 0) {
      const surface = shim.__surface(W, H);
      drawFrame(surface.getCanvas(), e, layout, t);
      if (want) save(surface, want);
      surface.dispose?.();
    }
    frameTimes.push(performance.now() - t0);
    if (e.gameOver) {
      const surface = shim.__surface(W, H);
      drawFrame(surface.getCanvas(), e, layout, t);
      save(surface, 'frame-gameover.png');
      break;
    }
  }
  frameTimes.sort((a, b) => a - b);
  const p = (q: number) => frameTimes[Math.floor(frameTimes.length * q)].toFixed(2);
  console.log(`physics+draw per frame (desktop CanvasKit): median ${p(0.5)}ms p95 ${p(0.95)}ms max ${p(0.999)}ms, fruits=${e.fruits.length}, score=${e.score}, merges=${e.merges}`);
});
