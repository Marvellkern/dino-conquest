import { SPECIES } from '../data/species.js';
import { MOVES, MOVE_UP } from '../data/moves.js';
import { TRAITS } from '../data/traits.js';
import { ZONES, ENEMY_SCALE, ZONE_HEAL, nextZone } from '../data/zones.js';
import { PROGRESSION, xpToNext, EVO_SUFFIX } from '../data/progression.js';
import { RELICS, PERKS, RELIC_TUNING } from '../data/relics.js';
import { MUTATIONS } from '../data/mutations.js';
import { FORMS } from '../data/forms.js';
import { makeFighter } from '../systems/combat.js';
import { makeRng } from '../systems/rng.js';
import { generateMap } from './mapgen.js';
import { extMods } from '../data/extinction.js';

// The current run lives here (in memory). No Phaser in this file.
export const session = { run: null };

// Options come from the meta save (systems/meta.js runSetup); the sim passes its own.
//   bonus: starting stat bonuses. lives: tries before the dino fossilizes.
//   ext: Extinction level. pool: fossil ids that can drop (default: all).
//   mutLock: locked "move:id" mutations. shopMult / discount: shop unlocks.
//   heir: { kind, id, move? } inherited from the last dino. skin: 'alpha' look.
export function newRun({
  species, trait, seed, zone = 'jungle', bonus = {}, lives = 3, ext = 0, pool = null, mutLock = [],
  shopMult = 1, discount = 0, heir = null, skin = null, zones = ['jungle', 'swamp']
}) {
  const rng = makeRng(seed);
  const dino = {
    species, traits: [trait], level: 1, xp: 0, evo: 0, pendingEvo: 0, skin,
    bonus: { hp: 0, atk: 0, def: 0, spd: 0, ...bonus }, moveUps: {}
  };
  dino.hp = dinoStats(dino).hp;
  const mods = { ...extMods(ext), shop: shopMult };
  const run = {
    seed, rng, zone, dino, at: null, amber: 0, cause: null, lives, maxLives: lives,
    relics: [], perks: [], mutations: {}, eggUsed: false,
    ext, mods, pool: pool ?? Object.keys(RELICS), mutLock, discount, heir, stats: {}, zones
  };
  run.map = generateMap(rng, zone, mods);
  if (heir?.kind === 'relic' && RELICS[heir.id]) addRelic(run, heir.id);
  if (heir?.kind === 'mutation' && MUTATIONS[heir.move]?.[heir.id]) addMutation(run, heir.move, heir.id);
  session.run = run;
  return run;
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
export const dinoName = (d) => FORMS[d.species]?.[d.evo]?.name ?? SPECIES[d.species].name + EVO_SUFFIX[d.evo];
// skin 'alpha': the Alpha Rex look (a goal reward), on every T-Rex form.
export const skinOf = (species, evo = 0, skin = null) => {
  const key = skin === 'alpha' && species === 'rex' ? 'alpharex' : species;
  return evo ? `${key}_e${evo}` : key;
};
export const dinoSkin = (d) => skinOf(d.species, d.evo, d.skin);
export const enemyName = (e) => (e.name ?? SPECIES[e.species].name);

/* ---------- fighters ---------- */

export function playerFighter(run) {
  const d = run.dino;
  return makeFighter(d.species, {
    side: 'player', level: d.level, traits: d.traits, stats: dinoStats(d), hp: d.hp, name: dinoName(d), moveUps: d.moveUps
  });
}

// The build handed to a fight: fossils + perks + mutations (systems/build.js).
export const buildOf = (run) => ({ relics: new Set([...run.relics, ...run.perks]), mut: { ...run.mutations }, run });

// One enemy spec → fighter. type: node type, for ENEMY_SCALE.
export function enemyFighter(e, type) {
  const sc = ENEMY_SCALE[type];
  const st = statsFor(e.species, e.level, e.evo ?? 0, {}, e.base);
  st.hp = Math.max(1, Math.round(st.hp * sc.hp * (e.hp ?? 1)));
  st.atk = Math.max(1, Math.round(st.atk * sc.atk * (e.atk ?? 1)));
  const traits = e.traits ?? (e.trait ? [e.trait] : []);
  const f = makeFighter(e.species, { side: 'enemy', level: e.level, traits, stats: st, name: enemyName(e) });
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
  return enemyFighter({ species, level, base: z.enemyBase?.[species], hp: 0.4, atk: 0.7, small: true }, 'fight');
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

// Applies one pending evolution: new form, stats, heal, and the form's perk.
// Returns the perk id (or null).
export function evolve(run) {
  const d = run.dino;
  const before = dinoStats(d).hp;
  d.evo = Math.min(EVO_SUFFIX.length - 1, d.evo + 1);
  d.pendingEvo = Math.max(0, d.pendingEvo - 1);
  const max = dinoStats(d).hp;
  d.hp = Math.min(max, d.hp + (max - before) + Math.round(max * PROGRESSION.evoHeal));
  const perk = FORMS[d.species]?.[d.evo]?.perk ?? null;
  if (perk && !run.perks.includes(perk)) run.perks.push(perk);
  return perk;
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
  if (stat === 'hp') d.hp = Math.max(1, Math.min(dinoStats(d).hp, d.hp + n));
}

/* ---------- fossils (relics) and mutations ---------- */

export const relicInfo = (id) => RELICS[id] ?? PERKS[id];

// Up to n fossils from the run's pool (or `from`) that it doesn't own yet.
export function relicOffers(run, n = 3, from = null) {
  const pool = (from ?? run.pool ?? Object.keys(RELICS)).filter((id) => !run.relics.includes(id));
  const out = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(run.rng.next() * pool.length), 1)[0]);
  return out;
}

// Fossils with an effect the moment they are picked up.
const ON_PICKUP = { crystalHeart: (run, k) => addStat(run.dino, 'hp', k * RELIC_TUNING.crystalHp) };

export function addRelic(run, id) {
  if (run.relics.includes(id)) return;
  run.relics.push(id);
  ON_PICKUP[id]?.(run, 1);
}

export function removeRandomRelic(run) {
  if (!run.relics.length) return null;
  const id = run.relics.splice(Math.floor(run.rng.next() * run.relics.length), 1)[0];
  ON_PICKUP[id]?.(run, -1);
  return id;
}

// A mutation choice for one not-yet-mutated base move: { move, options: [id...] }, or null.
// Locked mutations (run.mutLock) aren't offered.
export const mutationOptions = (run, move) => Object.keys(MUTATIONS[move]).filter((id) => !(run.mutLock ?? []).includes(`${move}:${id}`));

export function mutationOffer(run) {
  const open = Object.keys(MUTATIONS).filter((m) => !run.mutations[m] && mutationOptions(run, m).length);
  if (!open.length) return null;
  const move = run.rng.pick(open);
  return { move, options: mutationOptions(run, move) };
}

export function addMutation(run, move, id) { run.mutations[move] = id; }

// What a dino can pass to its heir: its fossils and mutations (not form perks).
export function heirOptions(run) {
  return [
    ...run.relics.map((id) => ({ kind: 'relic', id, name: RELICS[id].name })),
    ...Object.entries(run.mutations).map(([move, id]) => ({ kind: 'mutation', move, id, name: MUTATIONS[move][id].name }))
  ];
}

/* ---------- zones ---------- */

// After a zone boss: moves the run into the next zone (fresh map, a rest heal).
// Returns the new zone id, or null when that was the final zone.
export function advanceZone(run) {
  const id = nextZone(run.zone, run.zones);
  if (!id) return null;
  run.zone = id;
  run.map = generateMap(run.rng, id, run.mods);
  run.at = null;
  heal(run.dino, ZONE_HEAL);
  return id;
}

// Map position helpers.
export const reachable = (run) => (run.at ? run.map.nodes[run.at].next : [run.map.start]);
export const zoneOf = (run) => ZONES[run.zone];
