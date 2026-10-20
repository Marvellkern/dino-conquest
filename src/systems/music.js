// Chiptune background music (music brief v2.4), generated live from the note data in
// data/music.js: no audio files. Phaser-free.
// A lookahead scheduler (a 25ms timer queuing notes ~120ms ahead on the audio clock) plays
// each track, so frame drops never make the music stutter. Each note is its own oscillator
// (normal in WebAudio); the pulse waves and drum sounds are built once per context.
// Mix: lead / bass / arp / drums gains -> the track's fade gain -> lowpass (softens the
// squares) -> music volume -> the shared master (systems/sfx.js). The lead also feeds one
// echo (3 steps later, 0.25, no feedback).
import { audioContext, masterOut, onUnlock } from './sfx.js';
import { midiOf, parseNote, voice, kit, hit, swell, DRUM_SOUNDS } from './musicSynth.js';
import { TRACKS, STINGERS, CHORDS, LEAD, BASS, ARP, DRUMS } from '../data/music.js';

const LOOKAHEAD = 0.12, TICK = 25;
const BUS = 0.55, DEFAULT_VOL = 0.6; // the music level at the default volume (60), under the SFX
const LOWPASS = 5500;
const ECHO = { steps: 3, level: 0.25 };
// Reactive music (brief §7):
//   layers   map: no drums, lead at 70%; battle: everything; elite: everything, an extra hat
//            after each off-beat, +4 BPM
//   low HP   the lowpass slides down to 1.5 kHz and a soft heartbeat kick plays on beats 1-2
//   duck     -40% for a moment (crits, kills, Roar, boss phases)
//   phase 2  one beat of silence, then +8 BPM and the arp on square25
//   dim      40% while Settings is open
const LAYERS = { map: { lead: 0.7, drums: 0, bpm: 0 }, battle: { lead: 1, drums: 1, bpm: 0 }, full: { lead: 1, drums: 1, bpm: 0 }, elite: { lead: 1, drums: 1, bpm: 4, hats: 0.06 } };
const LOW_HP = { lowpass: 1500, ms: 400, beat: [[0, 0.32], [4, 0.24]] };
const DUCK = { level: 0.6, ms: 300 };
const PHASE2 = { bpm: 8, arp: 'square25', hush: 4 };
const DIM = 0.4;
const STING_DUCK = 0.3; // the track's level under a stinger

/* ---------- tracks ---------- */

// Note tokens (one string per bar, or one string) -> notes by step: { m, len } (len in steps).
function parseLine(line) {
  const toks = [line].flat().flatMap((bar) => bar.trim().split(/\s+/));
  const notes = [];
  toks.forEach((t, i) => {
    if (t === '-' || t === '.') return;
    let n = 1;
    while (toks[i + n] === '-') n++;
    notes[i] = { m: parseNote(t), len: n };
  });
  notes.steps = toks.length;
  return notes;
}

// A track's data turned into what the scheduler reads: lead notes by step, and per bar the
// bass and arp notes.
const compiled = new Map();
function compile(id) {
  if (compiled.has(id)) return compiled.get(id);
  const def = TRACKS[id];
  if (!def) throw new Error(`music: no track ${id}`);
  const lead = parseLine(def.lead);
  const bars = def.chords.map((name) => {
    const tones = CHORDS[name];
    if (!tones) throw new Error(`music: no chord ${name}`);
    const arp = [];
    for (const pc of tones) { // going up from the root in octave 4
      let m = midiOf(pc, 4);
      while (arp.length && m <= arp.at(-1)) m += 12;
      arp.push(m);
    }
    arp.push(midiOf(tones[0], 5));
    return { root: tones[0], fifth: tones[2] ?? tones[0], arp };
  });
  const t = { id, ...def, lead, bars, steps: def.chords.length * 16 };
  compiled.set(id, t);
  return t;
}

/* ---------- a playing track ---------- */

class Player {
  constructor(c, dest, id, at) {
    this.c = c;
    this.t = compile(id);
    this.id = id;
    this.layer = LAYERS.battle;
    this.phase2 = false;
    this.lowHp = false;
    this.hush = 0; // steps left to skip (the beat of silence before phase 2)
    this.out = c.createGain();
    this.out.gain.value = 0;
    this.out.connect(dest);
    this.ch = {};
    for (const k of ['lead', 'bass', 'arp', 'drums', 'fx']) (this.ch[k] = c.createGain()).connect(this.out); // fx: surf, kept on the map
    const vib = this.t.vibrato;
    if (vib) { // one slow LFO for every lead note
      this.lfoOsc = c.createOscillator();
      this.lfoOsc.frequency.value = vib.hz;
      this.lfo = c.createGain();
      this.lfo.gain.value = vib.cents;
      this.lfoOsc.connect(this.lfo);
      this.lfoOsc.start();
    }
    this.echo = c.createDelay(2);
    this.echo.delayTime.value = ECHO.steps * this.stepDur;
    const eg = c.createGain();
    eg.gain.value = ECHO.level;
    this.ch.lead.connect(this.echo).connect(eg).connect(this.out);
    this.step = 0;
    this.next = at;
  }

  get bpm() { return this.t.bpm + this.layer.bpm + (this.phase2 ? PHASE2.bpm : 0); }
  get stepDur() { return 60 / this.bpm / 4; }

  setLayer(name, ms = 400) {
    this.layer = LAYERS[name] ?? LAYERS.battle;
    const now = this.c.currentTime;
    this.ch.lead.gain.setTargetAtTime(this.layer.lead, now, Math.max(1, ms) / 3000);
    this.ch.drums.gain.setTargetAtTime(this.layer.drums, now, Math.max(1, ms) / 3000);
    this.retime();
  }

  setPhase2(on) {
    if (on === this.phase2) return;
    this.phase2 = on;
    if (on) this.hush = PHASE2.hush;
    this.retime();
  }

  retime() { this.echo.delayTime.setTargetAtTime(ECHO.steps * this.stepDur, this.c.currentTime, 0.05); }

  fade(to, ms) {
    const p = this.out.gain, now = this.c.currentTime;
    p.cancelScheduledValues(now);
    p.setValueAtTime(p.value, now);
    if (ms > 0) p.linearRampToValueAtTime(to, now + ms / 1000);
    else p.setValueAtTime(to, now);
  }

  // Queue every step that starts before `until` (audio-clock seconds).
  pump(until) {
    while (this.next < until) {
      const s = this.step % 16, swing = s % 4 === 2 ? this.t.swing * this.stepDur : 0;
      if (this.hush > 0) this.hush--;
      else this.play(this.step, this.next + swing);
      this.next += this.stepDur;
      this.step = (this.step + 1) % this.t.steps;
    }
  }

  play(i, t) {
    const { c, ch } = this, tr = this.t, sd = this.stepDur, s = i % 16, bar = Math.floor(i / 16), b = tr.bars[bar];
    const n = tr.lead[i];
    if (n) {
      const len = n.len * sd * 0.95, lfo = this.lfo;
      if (tr.detune) for (const dt of [-tr.detune, tr.detune]) voice(c, ch.lead, tr.leadWave, n.m, t, len, LEAD.vol * 0.7, LEAD.env, { detune: dt, lfo });
      else voice(c, ch.lead, tr.leadWave, n.m, t, len, LEAD.vol, LEAD.env, { lfo });
    }
    const bass = BASS[tr.bass];
    if (bass) for (const [at, kind, oct] of bass.notes) {
      if (at === s) voice(c, ch.bass, bass.wave ?? 'triangle', midiOf(b[kind], oct), t, bass.len * sd, bass.vol, bass.env);
    }
    const surf = tr.surf;
    if (surf && s === 0 && bar % surf.every === 0) swell(c, ch.fx, t, surf.every * 16 * sd, surf);
    const arp = ARP[tr.arp];
    if (arp && s % arp.every === 0) voice(c, ch.arp, this.phase2 ? PHASE2.arp : 'square12', b.arp[(s / arp.every) % b.arp.length], t, arp.len * sd, arp.vol, arp.env);
    const dr = DRUMS[Array.isArray(tr.drums) ? tr.drums[bar] : tr.drums]; // one pattern, or one per bar
    if (dr) {
      const k = kit(c), bars = tr.bars.length;
      const fill = dr.fill && (dr.fill.bars === 'last' ? bar === bars - 1 : dr.fill.bars.includes(bar + 1));
      for (const sound of DRUM_SOUNDS) {
        for (const [at, vol] of dr[sound] ?? []) if (at === s) hit(c, ch.drums, k[sound], t, vol);
        if (fill) for (const [at, vol] of dr.fill[sound] ?? []) if (at === s) hit(c, ch.drums, k[sound], t, vol);
      }
      if (this.layer.hats && s % 4 === 3) hit(c, ch.drums, k.hat, t, this.layer.hats);
    }
    if (this.lowHp) for (const [at, v] of LOW_HP.beat) if (at === s) hit(c, this.out, kit(c).kick, t, v); // past the layer gains: heard on every layer
  }

  disconnect() {
    this.out.disconnect();
    if (this.lfoOsc) { this.lfoOsc.stop(); this.lfoOsc.disconnect(); }
  }
}

/* ---------- the music player ---------- */

let c = null, bus = null, vol = null, duckG = null, timer = null;
let players = [];   // the playing track last; earlier ones are fading out
let wanted = null;  // the track the game asked for (kept while muted or locked)
let volume = DEFAULT_VOL, enabled = true;
let layer = 'battle', lowHp = false, dimmed = false;
let stBus = null, stVol = null; // stingers: their own path, not ducked with the tracks
let after = null;               // { id, timer }: the track to start once a stinger ends
const live = () => players.filter((p) => !p.dying);
const duckBase = () => (dimmed ? DIM : 1);

const audible = () => enabled && volume > 0;
const busGain = () => BUS * volume / DEFAULT_VOL;

function lowpass(ctx) {
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = LOWPASS;
  f.Q.value = 0.5;
  return f;
}

function ensure() {
  if (c) return true;
  c = audioContext();
  if (!c) return false;
  bus = lowpass(c);
  vol = c.createGain();
  vol.gain.value = busGain();
  duckG = c.createGain();
  duckG.gain.value = duckBase();
  bus.connect(vol).connect(duckG).connect(masterOut());
  stBus = lowpass(c);
  stVol = c.createGain();
  stVol.gain.value = busGain();
  stBus.connect(stVol).connect(masterOut());
  return true;
}

function tick() {
  if (!players.length) { clearInterval(timer); timer = null; return; }
  const until = c.currentTime + LOOKAHEAD;
  for (const p of players) p.pump(until);
}
function startTimer() { if (!timer && !document.hidden) timer = setInterval(tick, TICK); }

function retire(p, ms) {
  if (p.dying) return;
  p.dying = true;
  p.fade(0, ms);
  setTimeout(() => { p.disconnect(); players = players.filter((q) => q !== p); }, ms + 200);
}

function killAll() {
  for (const p of players) p.disconnect();
  players = [];
}

export const music = {
  // Crossfade to a track. The track already playing just keeps going. layer: set it too
  // (menus pass 'full', so the Nest never comes back drumless from the map).
  play(id, { fade = 600, layer: to } = {}) {
    if (after?.id === id) return; // already coming after a stinger
    if (after) { clearTimeout(after.timer); after = null; }
    wanted = id;
    if (to) this.setLayer(to);
    if (!audible() || !ensure()) return;
    const cur = players.at(-1);
    if (cur && cur.id === id && !cur.dying) return;
    for (const p of players) retire(p, fade);
    const p = new Player(c, bus, id, c.currentTime + 0.06);
    p.setLayer(layer, 0);
    p.lowHp = lowHp;
    p.fade(p.t.gain, fade);
    players.push(p);
    startTimer();
    tick();
  },

  stop({ fade = 600 } = {}) {
    wanted = null;
    for (const p of players) retire(p, fade);
  },

  get current() { return wanted; },

  // Which parts play: 'map' | 'battle' | 'elite' ('full' = battle, for menus). Kept across tracks.
  setLayer(name) {
    if (!LAYERS[name] || name === layer) return;
    layer = name;
    for (const p of live()) p.setLayer(name);
  },

  setLowHp(on) {
    if (on === lowHp) return;
    lowHp = on;
    for (const p of live()) p.lowHp = on;
    if (bus) bus.frequency.setTargetAtTime(on ? LOW_HP.lowpass : LOWPASS, c.currentTime, LOW_HP.ms / 3000);
  },

  // The playing track's boss phase 2 (a new track always starts in phase 1).
  setPhase2(on) { for (const p of live()) p.setPhase2(on); },

  duck(ms = DUCK.ms, level = DUCK.level) {
    if (!duckG) return;
    const g = duckG.gain, now = c.currentTime;
    g.cancelScheduledValues(now);
    g.setTargetAtTime(duckBase() * level, now, 0.015);
    g.setTargetAtTime(duckBase(), now + ms / 1000, 0.08);
  },

  // A one-shot (data/music.js STINGERS). The track ducks under it and comes back after; or,
  // with then, the track stops and then starts once the stinger is over (run end -> nest).
  stinger(id, { then = null } = {}) {
    const st = STINGERS[id];
    if (!st) return;
    if (then) {
      if (after) clearTimeout(after.timer);
      wanted = then;
      for (const p of players) retire(p, 300);
    }
    if (!audible() || !ensure()) { after = null; return; }
    const sd = 15 / st.bpm, t0 = c.currentTime + 0.03;
    let steps = 0;
    for (const part of st.parts) {
      const notes = parseLine(part.line);
      steps = Math.max(steps, notes.steps);
      notes.forEach((n, i) => n && voice(c, stBus, part.wave, n.m, t0 + i * sd, n.len * sd * 0.95, part.vol ?? LEAD.vol, part.env ?? st.env ?? LEAD.env));
    }
    const ms = steps * sd * 1000 + 250;
    if (then) after = { id: then, timer: setTimeout(() => { after = null; if (wanted === then) this.play(then, { fade: 800 }); }, ms) };
    else this.duck(ms, STING_DUCK);
  },

  // Settings open: the music drops to 40%.
  setDim(on) {
    dimmed = on;
    if (duckG) { duckG.gain.cancelScheduledValues(c.currentTime); duckG.gain.setTargetAtTime(duckBase(), c.currentTime, 0.1); }
  },
  // Dev: what the reactive parts are doing now.
  get state() {
    const p = live().at(-1);
    return { layer, lowHp, dimmed, bpm: p?.bpm, phase2: p?.phase2, lowpass: bus?.frequency.value, duck: duckG?.gain.value, lead: p?.ch.lead.gain.value, drums: p?.ch.drums.gain.value };
  },
  get playing() { return players.map((p) => (p.dying ? `${p.id} (fading)` : p.id)); },

  // Settings: volume 0-1 (Music slider), enabled (the Sound toggle). Muted, nothing runs.
  setVolume(v) {
    volume = v;
    if (vol) vol.gain.setTargetAtTime(busGain(), c.currentTime, 0.05);
    if (stVol) stVol.gain.setTargetAtTime(busGain(), c.currentTime, 0.05);
    this.refresh();
  },
  setEnabled(on) { enabled = on; this.refresh(); },
  refresh() {
    if (!audible()) killAll();
    else if (wanted && !players.length) this.play(wanted, { fade: 300 });
  },

  // Dev: render a track offline (loops times round) into an AudioBuffer, to measure its
  // loudness or listen: await music.render('jungle', 2).
  async render(id, loops = 1, rate = 44100) {
    const t = compile(id), secs = loops * t.steps * 15 / t.bpm;
    const oc = new OfflineAudioContext(1, Math.ceil((secs + 0.5) * rate), rate);
    const f = lowpass(oc);
    f.connect(oc.destination);
    const p = new Player(oc, f, id, 0);
    p.out.gain.value = t.gain;
    p.pump(secs);
    return oc.startRendering();
  }
};

// Start the wanted track on the first tap / key (inside the gesture, as browsers require).
onUnlock(() => { if (wanted) music.play(wanted, { fade: 300 }); });

// Hidden tab: stop the scheduler and pause the audio clock (battery); resume where it was.
document.addEventListener('visibilitychange', () => {
  if (!c) return;
  if (document.hidden) {
    clearInterval(timer);
    timer = null;
    c.suspend();
  } else {
    c.resume();
    if (players.length) startTimer();
  }
});

if (import.meta.env?.DEV) window.__music = music; // dev console: __music.render('boss'), __music.current
