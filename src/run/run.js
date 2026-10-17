import { SPECIES } from '../data/species.js';
import { MOVES, MOVE_UP } from '../data/moves.js';
import { TRAITS } from '../data/traits.js';
import { ZONES, ENEMY_SCALE, ZONE_HEAL, nextZone } from '../data/zones.js';
import { PROGRESSION, xpToNext, EVO_SUFFIX } from '../data/progression.js';
import { STAT_UPS } from '../data/upgrades.js';
import { makeFighter } from '../systems/combat.js';
import { makeRng } from '../systems/rng.js';
import { generateMap } from './mapgen.js';

// The current run lives here (in memory). No Phaser in this file.
export const session = { run: null };

// bonus: starting stat bonuses (from Lineage). lives: tries before the dino fossilizes.
export function newRun({ species, trait, seed, zone = 'jungle', bonus = {}, lives = 3 }) {
  const rng = makeRng(seed);
  const dino = {
    species, traits: [trait], level: 1, xp: 0, evo: 0, pendingEvo: 0,
    bonus: { hp: 0, atk: 0, def: 0, spd: 0, ...bonus }, moveUps: {}
  };
  dino.hp = dinoStats(dino).hp;
  session.run = { seed, rng, zone, dino, map: generateMap(rng, zone), at: null, amber: 0, cause: null, lives, maxLives: lives };
  return session.run;
}

/* ---------- stats ---------- */

// base: optional stat block that replaces the species' own (bosses use this).
export function statsFor(species, level, evo = 0, bonus = {}, base = SPECIES[species]) {
  const b = base;
  const g = (1 + PROGRESSION.growth * (level - 1)) * (1 + PROGRESSION.evoBoost * evo);
  const st = (k) => Math.round(b[k] * g + (bonus[k] ?? 0));
  return { hp: st('hp'), atk: st('atk'), def: st('def'), spd: st('spd') };
}

export const dinoStats = (d) => statsFor(d.species, d.level, d.evo, d.bonus);
export const dinoName = (d) => SPECIES[d.species].name + EVO_SUFFIX[d.evo];
export const skinOf = (species, evo = 0) => (evo ? `${species}_e${evo}` : species);
export const enemyName = (e) => (e.name ?? SPECIES[e.species].name);

/* ---------- fighters ---------- */

export function playerFighter(run) {
  const d = run.dino;
  return makeFighter(d.species, {
    side: 'player', level: d.level, traits: d.traits, stats: dinoStats(d), hp: d.hp, name: dinoName(d), moveUps: d.moveUps
  });
}

// One enemy spec → fighter. type: node type, for ENEMY_SCALE.
export function enemyFighter(e, type) {
  const sc = ENEMY_SCALE[type];
  const st = statsFor(e.species, e.level, e.evo ?? 0, {}, e.base);
  st.hp = Math.max(1, Math.round(st.hp * sc.hp * (e.hp ?? 1)));
  st.atk = Math.max(1, Math.round(st.atk * sc.atk * (e.atk ?? 1)));
  const f = makeFighter(e.species, { side: 'enemy', level: e.level, traits: e.trait ? [e.trait] : [], stats: st, name: enemyName(e) });
  f.brainId = e.brain ?? e.species;
  f.skin = e.skin ?? skinOf(e.species, e.evo);
  f.small = !!e.small;
  if (type === 'boss') f.levelLabel = 'BOSS';
  return f;
}

export const enemyFighters = (node) => node.enemies.map((e) => enemyFighter(e, node.type));

// A boss's summoned sidekick: a small pack member of the current zone.
export function minionFighter(zoneId, species, level) {
  const z = ZONES[zoneId];
  return enemyFighter({ species, level, base: z.enemyBase?.[species], hp: 0.4, atk: 0.7 }, 'fight');
}

// "3 COMPY", "RAPTOR + COMPY"... for the map tooltip.
export function groupName(node) {
  const names = node.enemies.map(enemyName);
  if (names.length > 1 && names.every((n) => n === names[0])) return `${names.length} ${names[0]}`;
  return names.join(' + ');
}

/* ---------- changes to the dino ---------- */

// Returns the number of levels gained. Level-ups add their extra max HP as healing.
export function gainXp(d, xp) {
  d.xp += xp;
  let levels = 0;
  while (d.xp >= xpToNext(d.level)) {
    const before = dinoStats(d).hp;
    d.xp -= xpToNext(d.level);
    d.level++;
    levels++;
    if (PROGRESSION.evoLevels.includes(d.level)) d.pendingEvo++;
    d.hp += dinoStats(d).hp - before;
  }
  return levels;
}

// Applies one pending evolution. Returns the upgraded move id (null if maxed).
export function evolve(d) {
  const before = dinoStats(d).hp;
  d.evo = Math.min(EVO_SUFFIX.length - 1, d.evo + 1);
  d.pendingEvo = Math.max(0, d.pendingEvo - 1);
  const max = dinoStats(d).hp;
  d.hp = Math.min(max, d.hp + (max - before) + Math.round(max * PROGRESSION.evoHeal));
  const special = SPECIES[d.species].special;
  if (!canUpgrade(d, special)) return null;
  upgradeMove(d, special);
  return special;
}

export const canUpgrade = (d, id) => (d.moveUps[id] ?? 0) < MOVE_UP.max;
export function upgradeMove(d, id) {
  if (canUpgrade(d, id)) d.moveUps[id] = (d.moveUps[id] ?? 0) + 1;
}

export function heal(d, frac) {
  const max = dinoStats(d).hp;
  const amt = Math.min(max - d.hp, Math.round(max * frac));
  d.hp += amt;
  return amt;
}

// Events can hurt but never kill.
export function hurt(d, frac) {
  const amt = Math.min(d.hp - 1, Math.round(dinoStats(d).hp * frac));
  d.hp -= amt;
  return amt;
}

export function addStat(d, stat, n) {
  d.bonus[stat] += n;
  if (stat === 'hp') d.hp += n;
}

/* ---------- Fossil Dig offers ---------- */

// Three different kinds when possible: a stat, a new trait, a move upgrade.
export function fossilOffers(run) {
  const { rng, dino: d } = run;
  const offers = [];
  const s = rng.pick(STAT_UPS);
  const n = s.amount(SPECIES[d.species]);
  offers.push({ label: s.label, sub: s.sub, apply: () => addStat(d, s.stat, n) });

  const newTraits = Object.keys(TRAITS).filter((t) => !d.traits.includes(t));
  if (d.traits.length < PROGRESSION.maxTraits && newTraits.length) {
    const t = rng.pick(newTraits);
    offers.push({ label: TRAITS[t].name, sub: `TRAIT: ${TRAITS[t].desc}`, apply: () => d.traits.push(t) });
  }

  const moves = ['bite', 'tail', 'roar', SPECIES[d.species].special].filter((id) => canUpgrade(d, id));
  if (moves.length) {
    const id = rng.pick(moves);
    const sub = MOVES[id].status ? 'LASTS 1 MORE TURN' : '+25% POWER';
    offers.push({ label: `${MOVES[id].name.toUpperCase()}+`, sub, apply: () => upgradeMove(d, id) });
  }

  while (offers.length < 3) {
    const extra = rng.pick(STAT_UPS.filter((u) => !offers.some((o) => o.label === u.label)));
    const amt = extra.amount(SPECIES[d.species]);
    offers.push({ label: extra.label, sub: extra.sub, apply: () => addStat(d, extra.stat, amt) });
  }
  return offers;
}

/* ---------- zones ---------- */

// After a zone boss: moves the run into the next zone (fresh map, a rest heal).
// Returns the new zone id, or null when that was the final zone.
export function advanceZone(run) {
  const id = nextZone(run.zone);
  if (!id) return null;
  run.zone = id;
  run.map = generateMap(run.rng, id);
  run.at = null;
  heal(run.dino, ZONE_HEAL);
  return id;
}

// Map position helpers.
export const reachable = (run) => (run.at ? run.map.nodes[run.at].next : [run.map.start]);
export const zoneOf = (run) => ZONES[run.zone];
