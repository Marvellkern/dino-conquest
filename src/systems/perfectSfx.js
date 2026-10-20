// Perfect Moments sounds (primal surge brief §2b), generated like every other sound:
//   chime  perfect dodge: a water drop, a sine gliding down a semitone + a quiet one an
//          octave and a fifth up, through a lowpass and a long soft reverb
//   ting   crit: two short bright triangles a fifth apart
//   snap   the counter lands: a filtered noise burst + a low thump
//   sigh   the streak is lost: a soft falling triangle
// step: the streak count, climbing a pentatonic scale in the current track's key.
// Phaser-free.
import { sfxBus, noiseBuffer, onUnlock } from './sfx.js';
import { music } from './music.js';
import { PENTA } from '../data/flow.js';

const PC = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
const REVERB_S = 1.2;

// The reverb: a convolver with a generated decaying-noise impulse response, built once.
const rooms = new WeakMap();
function reverb(c, out) {
  if (rooms.has(c)) return rooms.get(c);
  const n = Math.round(c.sampleRate * REVERB_S), ir = c.createBuffer(2, n, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 3;
  }
  const conv = c.createConvolver();
  conv.buffer = ir;
  conv.connect(out);
  rooms.set(c, conv);
  return conv;
}
onUnlock(() => { const b = sfxBus(); if (b) reverb(b.c, b.out); }); // build it before the first perfect

// The frequency of streak step n: the scale climbs from the key's root in octave 5.
export function stepHz(step) {
  const { root, minor } = music.key, sc = PENTA[minor ? 'minor' : 'major'];
  const n = Math.max(0, step - 1), k = Math.min(n, 10);
  const midi = 72 + PC[root] + sc[k % 5] + 12 * Math.floor(k / 5);
  return 440 * 2 ** ((midi - 69) / 12);
}

// One sine / triangle blip: f0 -> f1 over glide seconds, decaying over dur.
function blip(c, dest, { type = 'sine', f0, f1 = f0, glide = 0.08, dur, vol, at = 0, attack = 0.003 }) {
  const t = c.currentTime + at, o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(f1, t + glide);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
  o.connect(g).connect(dest);
  o.onended = () => g.disconnect();
  o.start(t);
  o.stop(t + dur + 0.02);
}

// A bus for one sound: dry into the SFX out, plus a send into the reverb.
function chain(c, out, { lowpass = 4000, wet = 0.6 } = {}) {
  const lp = c.createBiquadFilter(), send = c.createGain();
  lp.type = 'lowpass';
  lp.frequency.value = lowpass;
  send.gain.value = wet;
  lp.connect(out);
  lp.connect(send).connect(reverb(c, out));
  setTimeout(() => { lp.disconnect(); send.disconnect(); }, 400); // the blips are done; the reverb tail rings on
  return lp;
}

const play = (fn) => { try { const b = sfxBus(); if (b) fn(b.c, b.out); } catch { /* audio is optional */ } };

export const chime = (step = 1) => play((c, out) => {
  const f = stepHz(step), lp = chain(c, out, { lowpass: 4000, wet: 0.7 });
  blip(c, lp, { f0: f * 2 ** (1 / 12), f1: f, glide: 0.08, dur: 0.35, vol: 0.16 });
  blip(c, lp, { f0: f * 3 * 2 ** (1 / 12), f1: f * 3, glide: 0.08, dur: 0.22, vol: 0.04 });
});

export const ting = (step = 1) => play((c, out) => {
  const f = stepHz(step) * 2, lp = chain(c, out, { lowpass: 9000, wet: 0.25 });
  blip(c, lp, { type: 'triangle', f0: f, dur: 0.16, vol: 0.12, glide: 0.01 });
  blip(c, lp, { type: 'triangle', f0: f * 1.5, dur: 0.14, vol: 0.09, glide: 0.01, at: 0.012 });
});

export const snap = () => play((c, out) => {
  const t = c.currentTime, src = c.createBufferSource(), hp = c.createBiquadFilter(), g = c.createGain();
  src.buffer = noiseBuffer(c);
  hp.type = 'highpass';
  hp.frequency.value = 2200;
  g.gain.setValueAtTime(0.32, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
  src.connect(hp).connect(g).connect(out);
  src.onended = () => g.disconnect();
  src.start(t, Math.random() * 0.5);
  src.stop(t + 0.08);
  blip(c, out, { f0: 130, f1: 48, glide: 0.1, dur: 0.14, vol: 0.32 });
});

export const sigh = () => play((c, out) => {
  const f = stepHz(3), lp = chain(c, out, { lowpass: 3000, wet: 0.5 });
  blip(c, lp, { type: 'triangle', f0: f, f1: f / 2, glide: 0.3, dur: 0.34, vol: 0.09, attack: 0.03 });
});
