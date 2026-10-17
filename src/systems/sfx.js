// Tiny WebAudio synth — every sound is generated, no audio files.
// Audio only starts after the first user gesture (browser autoplay rules).
let ctx = null;
let master = null;
let noiseBuf = null;
let unlocked = false;
let enabled = true;

const unlock = () => { unlocked = true; };
window.addEventListener('pointerdown', unlock, { once: true, capture: true });
window.addEventListener('keydown', unlock, { once: true, capture: true });

function audio() {
  if (!unlocked) return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(c, { type = 'square', f0 = 440, f1 = f0, dur = 0.08, vol = 0.15, at = 0 }) {
  const t = c.currentTime + at;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(c, { dur = 0.1, vol = 0.2, f = 1200, f1 = f, q = 1, at = 0 }) {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t = c.currentTime + at;
  const src = c.createBufferSource();
  const bp = c.createBiquadFilter();
  const g = c.createGain();
  src.buffer = noiseBuf;
  bp.type = 'bandpass';
  bp.Q.value = q;
  bp.frequency.setValueAtTime(f, t);
  bp.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(bp).connect(g).connect(master);
  src.start(t);
  src.stop(t + dur + 0.02);
}

const SOUNDS = {
  blip: (c) => tone(c, { f0: 660, f1: 990, dur: 0.05, vol: 0.08 }),
  deny: (c) => tone(c, { f0: 160, f1: 120, dur: 0.1, vol: 0.1 }),
  tick: (c) => tone(c, { f0: 880, dur: 0.04, vol: 0.06 }),
  ding: (c) => { tone(c, { f0: 1320, dur: 0.06, vol: 0.08 }); tone(c, { f0: 1760, dur: 0.1, vol: 0.08, at: 0.05 }); },
  early: (c) => tone(c, { f0: 300, f1: 200, dur: 0.06, vol: 0.08 }),
  step: (c) => tone(c, { type: 'triangle', f0: 90, f1: 40, dur: 0.08, vol: 0.25 }),
  whoosh: (c) => noise(c, { dur: 0.12, vol: 0.12, f: 900, f1: 3200 }),
  tell: (c) => tone(c, { f0: 1000, f1: 1400, dur: 0.07, vol: 0.06 }),
  hit: (c) => { noise(c, { dur: 0.08, vol: 0.3, f: 1000, f1: 400 }); tone(c, { f0: 200, f1: 60, dur: 0.1, vol: 0.18 }); },
  crit: (c) => {
    noise(c, { dur: 0.18, vol: 0.4, f: 1800, f1: 300 });
    tone(c, { type: 'sawtooth', f0: 300, f1: 35, dur: 0.25, vol: 0.22 });
    tone(c, { f0: 1600, f1: 2200, dur: 0.06, vol: 0.06 });
  },
  weak: (c) => tone(c, { type: 'triangle', f0: 240, f1: 140, dur: 0.08, vol: 0.14 }),
  dodge: (c) => { noise(c, { dur: 0.16, vol: 0.18, f: 3000, f1: 700, q: 2 }); tone(c, { f0: 900, f1: 1500, dur: 0.08, vol: 0.05, at: 0.04 }); },
  block: (c) => { tone(c, { f0: 150, f1: 90, dur: 0.08, vol: 0.2 }); noise(c, { dur: 0.05, vol: 0.18, f: 600 }); },
  roar: (c) => { tone(c, { type: 'sawtooth', f0: 160, f1: 60, dur: 0.5, vol: 0.2 }); noise(c, { dur: 0.5, vol: 0.14, f: 500, f1: 200 }); },
  ko: (c) => tone(c, { f0: 440, f1: 55, dur: 0.6, vol: 0.15 }),
  fight: (c) => [392, 523].forEach((f, i) => tone(c, { f0: f, dur: 0.09, vol: 0.1, at: i * 0.08 })),
  win: (c) => [523, 659, 784, 1046].forEach((f, i) => tone(c, { f0: f, dur: 0.12, vol: 0.1, at: i * 0.1 })),
  growl: (c) => { tone(c, { type: 'sawtooth', f0: 90, f1: 55, dur: 0.8, vol: 0.2 }); noise(c, { dur: 0.8, vol: 0.1, f: 300, f1: 150 }); },
  levelup: (c) => [523, 784, 1046, 1568].forEach((f, i) => tone(c, { f0: f, dur: 0.08, vol: 0.09, at: i * 0.07 })),
  evolve: (c) => { tone(c, { type: 'square', f0: 160, f1: 1400, dur: 2.6, vol: 0.06 }); tone(c, { type: 'triangle', f0: 80, f1: 700, dur: 2.6, vol: 0.08 }); },
  boom: (c) => { noise(c, { dur: 0.5, vol: 0.45, f: 1200, f1: 80 }); tone(c, { type: 'sawtooth', f0: 220, f1: 30, dur: 0.6, vol: 0.25 }); },
  lose: (c) => [392, 330, 262].forEach((f, i) => tone(c, { f0: f, dur: 0.16, vol: 0.1, at: i * 0.14 }))
};

export const setSfx = (on) => { enabled = on; };

export function sfx(name) {
  if (!enabled) return;
  try {
    const c = audio();
    if (c) SOUNDS[name]?.(c);
  } catch { /* audio is optional */ }
}
