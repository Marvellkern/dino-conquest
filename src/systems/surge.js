// Primal Surge rules (data/surge.js). Phaser-free, on st.surge:
//   { meter, active, turns, apexUsed, critMove }
// The meter carries half into the next fight through run.surgeMeter (reset per zone).
import { SURGE, APEX, APEX_STRIKES } from '../data/surge.js';
import { MOVES, QTE_MULT } from '../data/moves.js';
import { SPECIES } from '../data/species.js';
import { RELIC_TUNING as RT } from '../data/relics.js';
import { has } from './build.js';

// Run-long counters for goals (data/goals.js).
const stat = (st, k, n = 1, max = false) => { const s = st.build.run?.stats; if (s) s[k] = max ? Math.max(s[k] ?? 0, n) : (s[k] ?? 0) + n; };

export function initSurge(st) {
  const fang = has(st, 'primalFang') ? RT.primalFangMeter : 0; // Primal Fang: every fight starts with some
  st.surge = { meter: Math.min(SURGE.max, (st.build.run?.surgeMeter ?? 0) + fang), active: false, turns: 0, apexUsed: false, critMove: false };
}

const carry = (st) => { if (st.build.run) st.build.run.surgeMeter = Math.floor(st.surge.meter * SURGE.carry); };
const bossFight = (st) => st.enemies.some((e) => e.boss);

// Add meter for an event: 'dodge' | 'crit' | 'kill' | 'hit' | 'block'. streak: the perfect
// streak after this event (dodges and crits). Crits count once per move. Nothing while a
// surge is on. Returns the meter gained (for the "+20" pop).
export function gain(st, kind, streak = 0) {
  const s = st.surge;
  if (!s || s.active || s.meter >= SURGE.max) return 0;
  if (kind === 'crit') { if (s.critMove) return 0; s.critMove = true; }
  let n = kind === 'hit' && has(st, 'rageGland') ? RT.rageHit : SURGE.gain[kind] ?? 0;
  if (kind === 'dodge' || kind === 'crit') n += Math.min(SURGE.streakMax, Math.max(0, streak - SURGE.streakFrom) * SURGE.streakBonus);
  if (bossFight(st)) n *= SURGE.bossMult;
  n = Math.min(Math.round(n), SURGE.max - s.meter);
  s.meter += n;
  carry(st);
  return n;
}

export const startMove = (st) => { if (st.surge) st.surge.critMove = false; };
export const ready = (st) => !!st.surge && !st.surge.active && st.surge.meter >= SURGE.max;
export const active = (st) => !!st.surge?.active;

// Go: +1 energy now, FEAR on the enemies, STAGGER on bosses.
export function activate(st) {
  const s = st.surge;
  Object.assign(s, { active: true, turns: has(st, 'warDrumBone') ? RT.warDrumTurns : SURGE.turns, apexUsed: false, meter: SURGE.max });
  stat(st, 'surges');
  st.energy += SURGE.energy;
  for (const e of st.enemies) if (e.hp > 0) { if (e.boss) e.status.stagger = 1; else e.status.fear = 1; }
  if (st.build.run) st.build.run.surgeMeter = 0;
}

// Start of each player turn (battleState.beginPlayerTurn): a surge turn passes; while one is
// left the dino gets its extra energy, then it ends.
export function onPlayerTurn(st) {
  const s = st.surge;
  if (!s?.active) return;
  if (--s.turns > 0) { st.energy += SURGE.energyTurn; return; }
  end(st);
}

export function end(st) {
  Object.assign(st.surge, { active: false, turns: 0, meter: 0 });
  for (const e of st.enemies) { e.status.fear = 0; e.status.stagger = 0; }
  carry(st);
}

export const critMult = (st) => (active(st) ? SURGE.critMult / QTE_MULT.crit : 1);
export const apexReady = (st) => active(st) && !st.surge.apexUsed;
export const apexInfo = (species) => APEX_STRIKES[species] ?? APEX_STRIKES.rex;

// The Apex Strike lands. beats: 'perfect' | 'good' | 'miss' per beat. Each landed beat is
// a share of the target's max HP x the species factor (perfect x1.25); all perfect: x1.5 on the lot. An aoe species
// spreads every hit over all the enemies. Returns { hits: [{ e, dmg, killed }], landed, perfect }.
export function apexHit(st, targets, beats) {
  st.surge.apexUsed = true;
  const p = st.player, m = MOVES[SPECIES[p.species].special] ?? MOVES.bite;
  const species = Math.sqrt((m.power * (m.hits ?? m.spread ?? 1)) / 1.5); // a multi-hit special counts all its hits
  const aoe = !!apexInfo(p.species).aoe;
  const landed = beats.filter((b) => b !== 'miss').length, perfect = beats.filter((b) => b === 'perfect').length;
  const all = perfect === beats.length ? APEX.allPerfect : 1;
  const hits = (aoe ? targets : targets.slice(0, 1)).map((e) => {
    let dmg = 0;
    for (const b of beats) {
      if (b === 'miss') continue;
      const mult = (b === 'perfect' ? APEX.perfectMult : 1) * all * (aoe ? APEX.aoeMult : 1);
      dmg += e.maxHp * (e.boss ? APEX.share.boss : APEX.share.normal) * species * mult * st.rng.range(0.95, 1.05);
    }
    dmg = Math.min(e.hp, Math.max(1, Math.round(dmg)));
    e.hp -= dmg;
    return { e, dmg, killed: e.hp <= 0 };
  });
  if (perfect === beats.length) stat(st, 'apexPerfect');
  stat(st, 'apexKills', hits.filter((h) => h.killed).length, true); // the most kills in one strike
  return { hits, landed, perfect };
}
