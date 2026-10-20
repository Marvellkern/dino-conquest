import { load, save, wipe, defaultSave } from './save.js';
import { setSfx, setSfxVolume } from './sfx.js';
import { doPulls } from './gacha.js';
import { music } from './music.js';
import { RELICS } from '../data/relics.js';
import { UNLOCKS, levelsOf, priceOf, BASE_RELICS, PACK_RELICS, GOAL_RELICS, LOCKED_MUTATIONS, STURDY_HP } from '../data/unlocks.js';
import { EXT_AMBER, MAX_EXT, extMods } from '../data/extinction.js';
import { BASE_LIVES } from '../data/progression.js';
import { ZONES, ZONE_ORDER } from '../data/zones.js';
import { SPECIES, HATCHABLE } from '../data/species.js';

// Meta progression (Amber, unlocks, goals, bloodline, Dino-dex, settings),
// loaded once at startup and written back with persist() after every change.
export const meta = load();
export const persist = () => save(meta);

/* ---------- unlocks ---------- */

export const owned = (id) => meta.unlocks[id] ?? 0;

// Buy the next level of a Nest unlock. Returns false if it can't be bought.
export function buyUnlock(id) {
  const u = UNLOCKS[id], lv = owned(id);
  if (!u || (u.needs && !owned(u.needs)) || lv >= levelsOf(id) || meta.amber < priceOf(id, lv)) return false;
  meta.amber -= priceOf(id, lv);
  meta.unlocks[id] = lv + 1;
  persist();
  return true;
}

// Fossils that can drop: the base set, bought packs, goal rewards.
export function relicPool() {
  const pool = [...BASE_RELICS];
  for (const [pack, ids] of Object.entries(PACK_RELICS)) if (owned(pack)) pool.push(...ids);
  for (const id of GOAL_RELICS) if (owned(`relic:${id}`)) pool.push(id);
  return pool.filter((id) => RELICS[id]);
}

// Species that can hatch: the base 7 plus bought eggs.
export const hatchable = () => HATCHABLE.filter((id) => !SPECIES[id].unlock || owned(SPECIES[id].unlock));

// Daily Hatchery: n pulls (1 or 10) on today's banner, saved before any reveal. Random
// filler eggs come from what you can hatch, never a Legendary.
export const gachaEggPool = () => hatchable().filter((id) => SPECIES[id].rarity !== 'legendary');
export function hatcheryPull(n, now = Date.now()) {
  const out = doPulls(meta, n, { now, eggPool: gachaEggPool() });
  if (!out.error) persist();
  return out;
}

export const lockedMutations = () => LOCKED_MUTATIONS.filter((k) => !owned(`mut:${k}`));
export const extUnlocked = () => !!owned('ext');
export const maxExtChoice = () => (extUnlocked() ? Math.min(MAX_EXT, meta.ext.best + 1) : 0);

// Everything a new run takes from the meta save (see run/run.js newRun).
export function runSetup() {
  const ext = Math.min(meta.ext.sel, maxExtChoice());
  return {
    ext,
    lives: Math.max(1, BASE_LIVES + owned('nineLives') + extMods(ext).lives),
    bonus: { hp: owned('sturdy') * STURDY_HP },
    pool: relicPool(),
    mutLock: lockedMutations(),
    shopMult: owned('traderTrail') ? 2 : 1,
    discount: owned('discount') ? 0.2 : 0,
    heir: meta.heir,
    zones: ZONE_ORDER.filter((z) => !ZONES[z].unlock || owned(ZONES[z].unlock))
  };
}

/* ---------- runs ---------- */

// Hatching a species reveals it in the Dino-dex.
export function markHatched(species) {
  const e = (meta.dex[species] ??= { hatched: 0, best: 0 });
  e.hatched++;
  persist();
}

// End of a run: bank Amber (+10% per Extinction level), record best level,
// crowns and the Extinction level cleared. Returns Amber banked.
export function bankRun(run, won) {
  const amber = Math.round(run.amber * (1 + EXT_AMBER * (run.ext ?? 0)));
  meta.amber += amber;
  meta.stats.runs++;
  if (won) meta.stats.wins++;
  const e = (meta.dex[run.dino.species] ??= { hatched: 1, best: 0 });
  e.best = Math.max(e.best, run.dino.level);
  if (won) {
    e.wins = (e.wins ?? 0) + 1; // crown in the Dino-dex
    e.ext = Math.max(e.ext ?? 0, run.ext ?? 0);
    if (extUnlocked()) meta.ext.best = Math.max(meta.ext.best, run.ext ?? 0);
  }
  persist();
  return amber;
}

// The dino joins the family tree. passed: what it handed to its heir (or null).
export function addAncestor(run, won, passed) {
  const d = run.dino, col = run.at ? run.map.nodes[run.at].row + 1 : 0;
  meta.stats.gens = (meta.stats.gens ?? 0) + 1;
  meta.fossils.push({
    gen: meta.stats.gens, species: d.species, evo: d.evo, variant: d.variant ?? null, level: d.level, zone: run.zone, col,
    cause: won ? null : run.cause, won, ext: run.ext ?? 0, inherited: run.heir?.name ?? null, passed: passed?.name ?? null, at: Date.now()
  });
  if (meta.fossils.length > 60) meta.fossils.shift();
  if (!won && !meta.hints?.ancestor) { // the first fall: a one-time hint about Ancestor Call
    meta.hints = { ...meta.hints, ancestor: true };
    meta.notice = { title: 'YOUR BLOODLINE', lines: ['FALLEN DINOS CAN ANSWER', 'YOUR CALL IN FUTURE RUNS', '(DURING AN APEX STRIKE).'] };
  }
  meta.heir = passed;
  persist();
}

/* ---------- settings ---------- */

// Push settings into the systems that use them (SFX, music, shake flag).
export function applySettings(registry) {
  const s = meta.settings;
  setSfx(s.sfx);
  setSfxVolume((s.sfxVol ?? 100) / 100);
  music.setEnabled(s.sfx);
  music.setVolume((s.music ?? 60) / 100);
  registry.set('shake', meta.settings.shake);
  registry.set('aim', s.aim ?? 'manual'); // counter aim (battle/flow.js)
}

// Erase everything and start from a fresh save (same object, so imports stay valid).
export function resetMeta() {
  wipe();
  for (const k of Object.keys(meta)) delete meta[k];
  Object.assign(meta, defaultSave());
  persist();
}
