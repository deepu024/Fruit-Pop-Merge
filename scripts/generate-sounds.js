#!/usr/bin/env node
/**
 * Generates every sound effect + the music loop as small mono 16-bit WAV files using
 * plain synthesis (sine/triangle partials + envelopes). 100% original, no samples.
 *
 *   node scripts/generate-sounds.js
 *
 * Replace any file in assets/sounds with your own royalty-free sound of the same name
 * to re-skin the audio. Keep files short; WAV/OGG/MP3 all work with expo-audio.
 */
const fs = require('fs');
const path = require('path');

const RATE = 22050;
const OUT = path.join(__dirname, '..', 'assets', 'sounds');
fs.mkdirSync(OUT, { recursive: true });

function writeWav(name, samples) {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    data.writeInt16LE(Math.round(s * 32767), i * 2);
  }
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write('WAVE', 8);
  h.write('fmt ', 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); // PCM
  h.writeUInt16LE(1, 22); // mono
  h.writeUInt32LE(RATE, 24);
  h.writeUInt32LE(RATE * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(data.length, 40);
  fs.writeFileSync(path.join(OUT, name), Buffer.concat([h, data]));
}

const buf = (sec) => new Float32Array(Math.ceil(sec * RATE));
const tri = (ph) => 2 * Math.abs(2 * (ph - Math.floor(ph + 0.5))) - 1;

/** Adds a tone with a frequency sweep and attack/decay envelope into `out`. */
function tone(out, { start = 0, dur, f0, f1 = f0, amp = 0.5, attack = 0.005, decay = 6, wave = 'sine', harm = 0 }) {
  const s0 = Math.floor(start * RATE);
  const n = Math.floor(dur * RATE);
  let ph = 0;
  for (let i = 0; i < n && s0 + i < out.length; i++) {
    const t = i / RATE;
    const k = i / n;
    const f = f0 * Math.pow(f1 / f0, k);
    ph += f / RATE;
    const env = Math.min(1, t / attack) * Math.exp(-decay * t) * (1 - k);
    let v = wave === 'tri' ? tri(ph) : Math.sin(2 * Math.PI * ph);
    if (harm) v += harm * Math.sin(4 * Math.PI * ph);
    out[s0 + i] += v * env * amp;
  }
  return out;
}

const note = (semi) => 440 * Math.pow(2, (semi - 9) / 12); // semi 0 = C4

// --- SFX
writeWav('drop.wav', tone(buf(0.12), { dur: 0.12, f0: 520, f1: 210, amp: 0.55, decay: 22 }));
writeWav('click.wav', tone(buf(0.06), { dur: 0.06, f0: 1400, f1: 1100, amp: 0.3, decay: 50 }));

// merge pitch rises with the fruit level (two semitones per level)
for (let lvl = 0; lvl < 11; lvl++) {
  const f = note(7 + lvl * 2); // from G4 up
  const out = buf(0.26);
  tone(out, { dur: 0.08, f0: f * 0.6, f1: f * 1.5, amp: 0.35, decay: 18 }); // bubble "bloop"
  tone(out, { start: 0.04, dur: 0.22, f0: f, amp: 0.45, decay: 12, harm: 0.3 });
  tone(out, { start: 0.04, dur: 0.18, f0: f * 2, amp: 0.12, decay: 16 });
  writeWav(`merge_${String(lvl).padStart(2, '0')}.wav`, out);
}

{
  const out = buf(0.45);
  [0, 4, 7, 12].forEach((s, i) => tone(out, { start: i * 0.06, dur: 0.22, f0: note(12 + s), amp: 0.35, decay: 9, wave: 'tri' }));
  writeWav('combo.wav', out);
}
{
  const out = buf(0.5);
  tone(out, { dur: 0.45, f0: 300, f1: 1400, amp: 0.3, decay: 4, wave: 'tri' });
  writeWav('powerup.wav', out);
}
{
  const out = buf(0.9);
  for (let i = 0; i < 9; i++) tone(out, { start: i * 0.06, dur: 0.35, f0: note(19 + ((i * 5) % 12)), amp: 0.22, decay: 8 });
  tone(out, { dur: 0.6, f0: 90, f1: 50, amp: 0.5, decay: 6 });
  writeWav('vanish.wav', out);
}
{
  const out = buf(1.2);
  [7, 4, 0, -5].forEach((s, i) => tone(out, { start: i * 0.2, dur: 0.45, f0: note(s), amp: 0.4, decay: 4, wave: 'tri' }));
  writeWav('gameover.wav', out);
}

// --- music: gentle 16-bar pentatonic arpeggio over a soft bass, loops seamlessly
{
  const bpm = 96;
  const beat = 60 / bpm;
  const bars = 8;
  const out = buf(bars * 4 * beat);
  const chords = [
    [0, 4, 7],
    [-3, 0, 4],
    [-7, -3, 0],
    [-5, -1, 2],
  ];
  const penta = [0, 2, 4, 7, 9, 12, 14, 16];
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let bar = 0; bar < bars; bar++) {
    const ch = chords[bar % chords.length];
    tone(out, { start: bar * 4 * beat, dur: 4 * beat * 0.95, f0: note(ch[0] - 12), amp: 0.16, attack: 0.05, decay: 0.6 });
    for (let e = 0; e < 8; e++) {
      const t = bar * 4 * beat + e * (beat / 2);
      const s = e % 2 === 0 ? ch[(e / 2) % 3] + 12 : penta[Math.floor(rnd() * penta.length)] + 12;
      tone(out, { start: t, dur: beat * 0.9, f0: note(s), amp: 0.09, attack: 0.01, decay: 5, wave: 'tri' });
    }
  }
  // fade the very ends a touch so the loop point is click-free
  const f = Math.floor(0.01 * RATE);
  for (let i = 0; i < f; i++) {
    out[i] *= i / f;
    out[out.length - 1 - i] *= i / f;
  }
  writeWav('music_loop.wav', out);
}

console.log(`Sounds written to ${OUT}`);
