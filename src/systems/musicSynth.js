// The music's instruments (systems/music.js plays them): note names, pulse waves, one note
// with its envelope, the drum kit rendered into buffers once per audio context, and the
// Coast's surf swell. Phaser-free.
import { noiseBuffer } from './sfx.js';

const PC = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
export const midiOf = (pc, oct) => (oct + 1) * 12 + PC[pc];
export const parseNote = (tok) => { const m = /^([A-G][#b]?)(-?\d)$/.exec(tok); if (!m) throw new Error(`music: bad note ${tok}`); return midiOf(m[1], +m[2]); };
const hz = (m) => 440 * 2 ** ((m - 69) / 12);

// Pulse waves (Fourier series of a pulse with that duty), one set per audio context.
const DUTY = { square50: 0.5, square25: 0.25, square12: 0.125 };
const waves = new WeakMap();
function pulse(c, wave) {
  if (!waves.has(c)) waves.set(c, {});
  const set = waves.get(c);
  if (!set[wave]) {
    const n = 48, re = new Float32Array(n), im = new Float32Array(n), d = DUTY[wave];
    for (let k = 1; k < n; k++) re[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * d);
    set[wave] = c.createPeriodicWave(re, im);
  }
  return set[wave];
}

// One note: oscillator -> envelope gain -> dest. detune in cents; lfo: a node to wobble the
// pitch with (vibrato).
export function voice(c, dest, wave, m, t, dur, vol, [a, d, s, r], { detune = 0, lfo = null } = {}) {
  const o = c.createOscillator(), g = c.createGain(), p = g.gain;
  if (wave === 'triangle') o.type = 'triangle';
  else o.setPeriodicWave(pulse(c, wave));
  o.frequency.value = hz(m);
  o.detune.value = detune;
  if (lfo) lfo.connect(o.detune);
  const end = t + Math.max(dur, a + 0.005);
  p.setValueAtTime(0, t);
  p.linearRampToValueAtTime(vol, t + a);
  p.setTargetAtTime(vol * s, t + a, d / 3);
  p.setTargetAtTime(0, end, r / 3);
  o.connect(g).connect(dest);
  o.onended = () => { g.disconnect(); if (lfo) lfo.disconnect(o.detune); };
  o.start(t);
  o.stop(end + r * 3 + 0.01);
}

// The drum sounds, rendered once per context into buffers (exact brief recipes):
//   kick   sine sweeping 150 -> 60 Hz (60 + 90e^-40t), amp e^-18t, 160ms
//   snare  noise x0.8 + 190 Hz sine x0.4, amp e^-22t, 140ms
//   hat    high-passed noise (first difference), closed e^-120t 30ms, open e^-25t 120ms
const kits = new WeakMap();
export function kit(c) {
  if (kits.has(c)) return kits.get(c);
  const sr = c.sampleRate, noise = noiseBuffer(c).getChannelData(0);
  const make = (ms, fn) => {
    const n = Math.round(sr * ms / 1000), b = c.createBuffer(1, n, sr), d = b.getChannelData(0);
    const fade = Math.round(sr * 0.004);
    for (let i = 0; i < n; i++) d[i] = fn(i / sr, i) * Math.min(1, (n - i) / fade);
    return b;
  };
  const k = {
    kick: make(160, (t) => Math.sin(2 * Math.PI * (60 * t + 2.25 * (1 - Math.exp(-40 * t)))) * Math.exp(-18 * t)),
    snare: make(140, (t, i) => (noise[i] * 0.8 + Math.sin(2 * Math.PI * 190 * t) * 0.4) * Math.exp(-22 * t)),
    hat: make(30, (t, i) => (noise[i + 1] - noise[i]) * 0.5 * Math.exp(-120 * t)),
    open: make(120, (t, i) => (noise[i + 1] - noise[i]) * 0.5 * Math.exp(-25 * t)),
    // tom: the kick pitched up, 120 -> 80 Hz; bloop: a short triangle pitch drop (the Swamp's hats)
    tom: make(220, (t) => Math.sin(2 * Math.PI * (80 * t + 1 * (1 - Math.exp(-40 * t)))) * Math.exp(-12 * t)),
    bloop: make(90, (t) => tri(180 * t + (520 / 30) * (1 - Math.exp(-30 * t))) * Math.exp(-25 * t))
  };
  kits.set(c, k);
  return k;
}

const tri = (x) => 4 * Math.abs(x - Math.floor(x + 0.5)) - 1; // triangle wave of phase x (cycles)
export const DRUM_SOUNDS = ['kick', 'snare', 'hat', 'open', 'tom', 'bloop'];

// Surf: looped noise through a bandpass, swelling in then out over dur seconds.
export function swell(c, dest, t, dur, { vol, freq }) {
  const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  src.buffer = noiseBuffer(c);
  src.loop = true;
  f.type = 'bandpass';
  f.frequency.setValueAtTime(freq * 0.6, t);
  f.frequency.linearRampToValueAtTime(freq, t + dur / 2);
  f.frequency.linearRampToValueAtTime(freq * 0.6, t + dur);
  f.Q.value = 0.7;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + dur / 2);
  g.gain.linearRampToValueAtTime(0, t + dur);
  src.connect(f).connect(g).connect(dest);
  src.onended = () => g.disconnect();
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.05);
}

export function hit(c, dest, buf, t, vol) {
  const s = c.createBufferSource(), g = c.createGain();
  s.buffer = buf;
  g.gain.value = vol;
  s.connect(g).connect(dest);
  s.onended = () => g.disconnect();
  s.start(t);
}
