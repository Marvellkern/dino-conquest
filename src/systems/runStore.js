import { session } from '../run/run.js';
import { RUN_VERSION, serializeRun, deserializeRun, migrateRun } from '../run/runSave.js';

// The run in progress, saved in its own localStorage slot (apart from the meta save,
// so a bad run save can't touch meta progress). A save is a checkpoint, a snapshot
// of the run taken at a safe point (arriving at a node, a fight starting, a fight
// won, an evolution, the end screens), plus every popup choice made since. Reloading
// restores the snapshot (RNG state included) and replays those choices, so a fight,
// a reward, a shop or an event comes out exactly the same: no rerolls.
// phase: where to resume. { kind: 'map' | 'node' (id) | 'battle' (node, seed) |
//   'rewards' (elite, levels) | 'evolve' | 'end' (won) }
const KEY = 'dino-conquest:run';
let rec = null;      // { v, snap, phase, log }
let replay = [];     // choices still to auto-answer after a resume
let resumeAt = null; // the phase a resumed run should pick up, taken once

function write() {
  if (!rec) return;
  try { localStorage.setItem(KEY, JSON.stringify(rec)); } catch { /* storage full or blocked: play on */ }
}

export function checkpoint(run, phase) {
  rec = { v: RUN_VERSION, snap: serializeRun(run), phase, log: [] };
  replay = [];
  write();
}

// Popups (ui/popup.js) during a run: answer from the replay, or record a fresh pick.
export const replaying = () => replay.length > 0;
export const takeReplay = () => replay.shift();
// The replay went out of step (it just handed out a choice that doesn't fit): keep the
// choices that did fit and ask the player from here on.
export function dropReplay() {
  if (rec) rec.log = rec.log.slice(0, rec.log.length - replay.length - 1);
  replay = [];
}
export function logPick(i) {
  if (!rec) return;
  rec.log.push(i);
  write();
}

// Last-moment save when the tab hides (everything is already written; this is a safety net).
export const quickSave = write;

export function clearRun() {
  rec = null;
  replay = [];
  resumeAt = null;
  try { localStorage.removeItem(KEY); } catch { /* nothing to clear */ }
}

// The saved run, if any: { rec } or { error } (unreadable: it's dropped).
function read() {
  let raw;
  try { raw = localStorage.getItem(KEY); } catch { return {}; }
  if (!raw) return {};
  try {
    const r = migrateRun(JSON.parse(raw));
    deserializeRun(r.snap); // throws if it can't be played
    return { rec: r };
  } catch {
    clearRun();
    return { error: true };
  }
}

// For Home: what's saved, without loading it. { run, phase } | { error } | {}.
export function peekRun() {
  const { rec: r, error } = read();
  return r ? { run: r.snap, phase: r.phase } : { error };
}

// Load the saved run into session.run. Returns its phase, or null.
export function resumeRun() {
  const { rec: r } = read();
  if (!r) return null;
  rec = r;
  session.run = deserializeRun(r.snap);
  replay = [...r.log];
  resumeAt = r.phase;
  return r.phase;
}

export function takeResume() {
  const p = resumeAt;
  resumeAt = null;
  return p;
}
