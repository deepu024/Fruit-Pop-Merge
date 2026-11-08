import { ClipOp, PaintStyle, Skia, StrokeCap, TileMode, type SkCanvas, type SkPaint, type SkPicture } from '@shopify/react-native-skia';

import { FRUITS, type FruitDef } from '../game/fruits';

/**
 * Every fruit is drawn once, procedurally, at radius ART_R around (0,0) and cached as
 * an SkPicture. The game then draws each fruit with a single drawPicture + transform.
 */
export const ART_R = 100;
const BOUNDS = Skia.XYWHRect(-150, -170, 300, 320);

const cache = new Map<string, SkPicture>();

export function fruitPicture(level: number, blink = false): SkPicture {
  const key = `${level}:${blink ? 1 : 0}`;
  let pic = cache.get(key);
  if (!pic) {
    const rec = Skia.PictureRecorder();
    drawFruit(rec.beginRecording(BOUNDS), level, blink);
    pic = rec.finishRecordingAsPicture();
    cache.set(key, pic);
  }
  return pic;
}

/** Warm the cache up front so the first merge never hitches. */
export function preloadFruitArt() {
  for (let i = 0; i < FRUITS.length; i++) {
    fruitPicture(i, false);
    fruitPicture(i, true);
  }
}

// ---------------------------------------------------------------- helpers
const c = (s: string) => Skia.Color(s);

function fill(color: string, alpha = 1): SkPaint {
  const p = Skia.Paint();
  p.setAntiAlias(true);
  p.setColor(c(color));
  p.setAlphaf(alpha);
  return p;
}

function stroke(color: string, width: number, alpha = 1): SkPaint {
  const p = fill(color, alpha);
  p.setStyle(PaintStyle.Stroke);
  p.setStrokeWidth(width);
  p.setStrokeCap(StrokeCap.Round);
  return p;
}

function ellipse(cv: SkCanvas, x: number, y: number, rx: number, ry: number, paint: SkPaint, rotDeg = 0) {
  cv.save();
  cv.translate(x, y);
  if (rotDeg) cv.rotate(rotDeg, 0, 0);
  cv.drawOval(Skia.XYWHRect(-rx, -ry, rx * 2, ry * 2), paint);
  cv.restore();
}

function leaf(cv: SkCanvas, x: number, y: number, len: number, rotDeg: number, color: string) {
  ellipse(cv, x, y, len, len * 0.45, fill(color), rotDeg);
  cv.save();
  cv.translate(x, y);
  cv.rotate(rotDeg, 0, 0);
  cv.drawLine(-len * 0.8, 0, len * 0.8, 0, stroke('#FFFFFF', 3, 0.35));
  cv.restore();
}

function stem(cv: SkCanvas, x0: number, y0: number, x1: number, y1: number, bend: number, width = 8) {
  const path = Skia.PathBuilder.Make();
  path.moveTo(x0, y0);
  path.quadTo((x0 + x1) / 2 + bend, (y0 + y1) / 2, x1, y1);
  cv.drawPath(path.build(), stroke('#7A4B2A', width));
}

function circlePath(r = ART_R) {
  const p = Skia.PathBuilder.Make();
  p.addCircle(0, 0, r);
  return p.build();
}

// ---------------------------------------------------------------- fruit
function body(cv: SkCanvas, d: FruitDef) {
  // soft contact shadow
  ellipse(cv, 0, ART_R * 0.92, ART_R * 0.7, ART_R * 0.14, fill('#3A1F4D', 0.12));
  const p = fill(d.base);
  p.setShader(
    Skia.Shader.MakeRadialGradient({ x: -ART_R * 0.35, y: -ART_R * 0.42 }, ART_R * 1.55, [c(d.light), c(d.base), c(d.dark)], [0, 0.45, 1], TileMode.Clamp),
  );
  cv.drawCircle(0, 0, ART_R, p);
}

function rimAndShine(cv: SkCanvas, d: FruitDef) {
  cv.drawCircle(0, 0, ART_R - 2, stroke(d.dark, 5, 0.45));
  ellipse(cv, -ART_R * 0.42, -ART_R * 0.5, ART_R * 0.3, ART_R * 0.17, fill('#FFFFFF', 0.55), -35);
  ellipse(cv, -ART_R * 0.66, -ART_R * 0.16, ART_R * 0.07, ART_R * 0.07, fill('#FFFFFF', 0.5));
}

function face(cv: SkCanvas, blink: boolean) {
  const ex = ART_R * 0.3;
  const ey = ART_R * 0.08;
  if (blink) {
    for (const s of [-1, 1]) {
      const path = Skia.PathBuilder.Make();
      path.moveTo(s * ex - 11, ey);
      path.quadTo(s * ex, ey + 10, s * ex + 11, ey);
      cv.drawPath(path.build(), stroke('#2B1630', 6));
    }
  } else {
    for (const s of [-1, 1]) {
      ellipse(cv, s * ex, ey, 10, 13, fill('#2B1630'));
      cv.drawCircle(s * ex - 3, ey - 5, 4.2, fill('#FFFFFF'));
      cv.drawCircle(s * ex + 3.5, ey + 4, 1.8, fill('#FFFFFF', 0.8));
    }
  }
  for (const s of [-1, 1]) ellipse(cv, s * ART_R * 0.5, ART_R * 0.3, 13, 8, fill('#FF6F91', 0.45));
  const mouth = Skia.PathBuilder.Make();
  mouth.moveTo(-9, ART_R * 0.28);
  mouth.quadTo(0, ART_R * 0.28 + 10, 9, ART_R * 0.28);
  cv.drawPath(mouth.build(), stroke('#2B1630', 4.5));
}

function details(cv: SkCanvas, d: FruitDef) {
  const R = ART_R;
  cv.save();
  cv.clipPath(circlePath(R - 3), ClipOp.Intersect, true);
  switch (d.name) {
    case 'Strawberry':
      for (let y = -50; y <= 70; y += 30)
        for (let x = -80; x <= 80; x += 32) {
          const ox = (Math.round(y / 30) % 2) * 16;
          if ((x + ox) ** 2 + y ** 2 < 80 ** 2 && Math.abs(x + ox) > 6) ellipse(cv, x + ox, y, 4, 6, fill('#FFE680', 0.9));
        }
      break;
    case 'Grape':
      for (let a = 0; a < 7; a++) {
        const ang = (a / 7) * Math.PI * 2;
        cv.drawCircle(Math.cos(ang) * 58, Math.sin(ang) * 58, 26, fill(d.light, 0.18));
      }
      break;
    case 'Orange':
      for (let i = 0; i < 26; i++) {
        const ang = i * 2.4;
        const rr = 25 + ((i * 37) % 60);
        cv.drawCircle(Math.cos(ang) * rr, Math.sin(ang) * rr, 2.6, fill(d.dark, 0.18));
      }
      break;
    case 'Pear':
      for (let i = 0; i < 18; i++) {
        const ang = i * 2.1;
        const rr = 30 + ((i * 29) % 55);
        cv.drawCircle(Math.cos(ang) * rr, Math.sin(ang) * rr, 2.4, fill('#8A6A2A', 0.25));
      }
      break;
    case 'Apple': {
      // top dimple + a few sunny streaks
      const dent = Skia.PathBuilder.Make();
      dent.moveTo(-26, -R * 0.84);
      dent.quadTo(0, -R * 0.7, 26, -R * 0.84);
      cv.drawPath(dent.build(), stroke(d.dark, 6, 0.55));
      for (let i = -2; i <= 2; i++) cv.drawLine(i * 22 + 10, 30, i * 26 + 14, 80, stroke('#FFE08A', 4, 0.25));
      break;
    }
    case 'Peach': {
      const path = Skia.PathBuilder.Make();
      path.moveTo(-4, -R);
      path.quadTo(-38, -30, -10, 20);
      cv.drawPath(path.build(), stroke(d.dark, 6, 0.5));
      break;
    }
    case 'Pineapple':
      for (let k = -200; k <= 200; k += 34) {
        cv.drawLine(k - 120, -120, k + 120, 120, stroke(d.dark, 4, 0.45));
        cv.drawLine(k + 120, -120, k - 120, 120, stroke(d.dark, 4, 0.45));
      }
      break;
    case 'Melon':
      for (let k = -90; k <= 90; k += 30) {
        const p1 = Skia.PathBuilder.Make();
        p1.moveTo(k - 40, -R);
        p1.quadTo(k + 30, 0, k - 40, R);
        cv.drawPath(p1.build(), stroke('#F4FFE8', 3, 0.55));
        const p2 = Skia.PathBuilder.Make();
        p2.moveTo(-R, k - 30);
        p2.quadTo(0, k + 25, R, k - 30);
        cv.drawPath(p2.build(), stroke('#F4FFE8', 3, 0.45));
      }
      break;
    case 'Watermelon':
      for (let k = -100; k <= 100; k += 40) {
        const path = Skia.PathBuilder.Make();
        path.moveTo(k, -R);
        path.cubicTo(k - 22, -40, k + 22, 40, k, R);
        cv.drawPath(path.build(), stroke(d.accent, 14, 0.9));
      }
      break;
  }
  cv.restore();
}

function crown(cv: SkCanvas, d: FruitDef) {
  const R = ART_R;
  switch (d.name) {
    case 'Cherry':
      // long twin-style stem: a second, smaller stem curling off to the side
      stem(cv, 0, -R * 0.85, 26, -R * 1.5, -24);
      stem(cv, 26, -R * 1.5, -30, -R * 1.25, -10, 6);
      leaf(cv, 52, -R * 1.38, 24, -25, d.accent);
      break;
    case 'Strawberry':
      for (let i = -2; i <= 2; i++) leaf(cv, i * 20, -R * 0.9 + Math.abs(i) * 6, 26, i * 28 + (i === 0 ? 90 : 0), d.accent);
      break;
    case 'Grape':
      stem(cv, 0, -R * 0.9, 8, -R * 1.25, 10, 9);
      leaf(cv, 40, -R * 1.05, 30, -20, d.accent);
      break;
    case 'Orange':
      cv.drawCircle(0, -R * 0.9, 7, fill('#6B8F2A'));
      leaf(cv, 30, -R * 1.0, 26, -15, d.accent);
      break;
    case 'Persimmon':
      for (let i = 0; i < 4; i++) leaf(cv, Math.cos((i * Math.PI) / 2 + 0.4) * 30, -R * 0.86 + Math.sin((i * Math.PI) / 2 + 0.4) * 9, 30, i * 90 + 23, d.accent);
      cv.drawCircle(0, -R * 0.88, 9, fill('#4A6B1F'));
      break;
    case 'Apple':
    case 'Pear':
      stem(cv, 0, -R * 0.82, 10, -R * 1.3, 14, 9);
      leaf(cv, 42, -R * 1.12, 30, -25, d.name === 'Apple' ? d.accent : '#6FBF4A');
      break;
    case 'Peach':
      leaf(cv, 22, -R * 1.02, 32, -30, d.accent);
      leaf(cv, -18, -R * 1.03, 26, 210, d.accent);
      break;
    case 'Pineapple':
      for (let i = -3; i <= 3; i++) {
        const path = Skia.PathBuilder.Make();
        const bx = i * 14;
        path.moveTo(bx - 12, -R * 0.85);
        path.lineTo(bx + i * 9, -R * 1.55 + Math.abs(i) * 12);
        path.lineTo(bx + 12, -R * 0.85);
        path.close();
        cv.drawPath(path.build(), fill(i % 2 ? d.accent : '#4CC27A'));
      }
      break;
    case 'Melon':
      stem(cv, 0, -R * 0.92, 0, -R * 1.15, 0, 10);
      cv.drawLine(-12, -R * 1.15, 12, -R * 1.15, stroke('#7A4B2A', 8));
      break;
    case 'Watermelon':
      stem(cv, 0, -R * 0.94, 14, -R * 1.18, 10, 8);
      break;
  }
}

function drawFruit(cv: SkCanvas, level: number, blink: boolean) {
  const d = FRUITS[level];
  const back = d.name === 'Cherry' || d.name === 'Grape' || d.name === 'Apple' || d.name === 'Pear' || d.name === 'Melon' || d.name === 'Watermelon';
  if (back) crown(cv, d); // stems sit behind the body
  body(cv, d);
  details(cv, d);
  rimAndShine(cv, d);
  if (!back) crown(cv, d);
  face(cv, blink);
}
