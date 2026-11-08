/**
 * Jest-only stand-in for @shopify/react-native-skia: the real Skia API backed by
 * CanvasKit (WASM), so render code can be exercised on a dev machine without a phone.
 */
const fs = require('fs');
const { JsiSkApi } = require('@shopify/react-native-skia/lib/commonjs/skia/web');
const types = require('@shopify/react-native-skia/lib/commonjs/skia/types');

let real = null;
let fontData = null;
const FONT = '/System/Library/Fonts/Supplemental/Arial Rounded Bold.ttf';

async function init() {
  global.CanvasKit = await require('canvaskit-wasm')();
  real = JsiSkApi(global.CanvasKit);
  if (fs.existsSync(FONT)) fontData = real.Data.fromBytes(new Uint8Array(fs.readFileSync(FONT)));
}

const Skia = new Proxy({}, { get: (_, k) => real[k] });

function matchFont({ fontSize = 14 } = {}) {
  const tf = fontData ? real.Typeface.MakeFreeTypeFaceFromData(fontData) : null;
  return real.Font(tf, fontSize);
}

module.exports = { ...types, Skia, matchFont, __init: init, __surface: (w, h) => real.Surface.MakeOffscreen(w, h) };
