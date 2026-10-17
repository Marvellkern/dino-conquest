import { SPECIES } from '../data/species.js';
import { MOVE_UP, STATUS, QTE, QTE_MULT, DEFEND_MULT, DAMAGE } from '../data/moves.js';
import { TRAIT_TUNING as T } from '../data/traits.js';

// Pure combat rules — no Phaser in here. Turn flow lives in battleState.js.

// stats: { hp, atk, def, spd } (defaults to species base); hp: current HP.
export function makeFighter(species, {
  side = 'player', level = 1, traits = [], hpMult = 1, stats = null, hp = null, name = null, moveUps = {}
} = {}) {
  const sp = SPECIES[species];
  const st = stats ?? sp;
  const maxHp = Math.round(st.hp * hpMult);
  return {
    side, species, level, traits, moveUps,
    name: name ?? sp.name,
    maxHp, hp: Math.min(hp ?? maxHp, maxHp),
    atk: st.atk, def: st.def, spd: st.spd,
    moves: ['bite', 'tail', 'roar', 'brace', sp.special],
    status: {
      atkDown: 0, defUp: 0, poison: 0, stun: 0,
      braced: 0, muddy: 0, drain: 0,         // player
      guard: 0, charging: 0, submerged: 0    // enemies
    }
  };
}

export const hasTrait = (f, id) => f.traits.includes(id);

// Start of the owner's turn: poison bites, stun is consumed.
export function startTurn(f) {
  const out = { poison: 0, stunned: false };
  if (f.status.poison > 0) {
    out.poison = Math.min(f.hp, T.venomDmg);
    f.hp -= out.poison;
    f.status.poison--;
  }
  if (f.status.stun > 0) {
    f.status.stun--;
    out.stunned = true;
  }
  return out;
}

// Timed buffs/debuffs tick at the end of the affected fighter's turn.
const TIMED = ['atkDown', 'defUp'];
export function endTurn(f) {
  for (const k of TIMED) if (f.status[k] > 0) f.status[k]--;
}

// Self-applied buffs get +1 so they survive the end of the turn they're cast.
export function applyStatus(f, { stat, turns }, self = false) {
  f.status[stat] = turns + (self ? 1 : 0);
}

export function effAtk(f) {
  let a = f.atk;
  if (f.status.atkDown > 0) a *= STATUS.atkDownMult;
  if (hasTrait(f, 'packInstinct') && f.hp < f.maxHp / 2) a *= T.packMult;
  return a;
}

export const effDef = (f) => f.def + (f.status.defUp > 0 ? STATUS.defUpAmount : 0);

// Guarding enemies, and chargers with charge armor, take reduced damage.
export const isGuarded = (f) => f.status.guard > 0 || (f.status.charging > 0 && f.armorCharging);

// rng = null gives the exact (variance-free) number; enemy attacks use that so
// the intent shown above an enemy is exactly what lands on a clean hit.
export function computeDamage(att, dfd, move, rng, { qte = 'good', defend = 'hit', mult = 1 } = {}) {
  if (defend === 'dodge') return 0;
  const def = effDef(dfd) * (1 - (move.defIgnore ?? 0));
  const up = 1 + MOVE_UP.power * (att.moveUps?.[move.id] ?? 0);
  let raw = effAtk(att) * move.power * up * QTE_MULT[qte] * mult;
  if (defend === 'block') raw *= move.blockMult ?? DEFEND_MULT.block;
  if (hasTrait(dfd, 'thickHide')) raw *= T.thickHide;
  if (isGuarded(dfd)) raw *= STATUS.guardMult;
  const v = rng ? rng.range(0.9, 1.1) : 1;
  return Math.max(1, Math.round(raw * DAMAGE.scale * (DAMAGE.defK / (DAMAGE.defK + def)) * v));
}

// Trait triggers after damage lands. Returns what happened, for feedback.
export function afterHit(att, dfd, dmg) {
  const out = { poisoned: false, healed: 0 };
  if (dmg > 0 && dfd.hp > 0 && hasTrait(att, 'venomBite')) {
    out.poisoned = dfd.status.poison <= 0;
    dfd.status.poison = T.venomTurns;
  }
  if (dfd.hp <= 0 && hasTrait(att, 'bloodlust')) {
    out.healed = Math.min(Math.round(att.maxHp * T.bloodlust), att.maxHp - att.hp);
    att.hp += out.healed;
  }
  return out;
}

// Roar duration grows with its upgrade level.
export const roarTurns = (att, m) => m.effect.turns + MOVE_UP.statusTurns * (att.moveUps?.[m.id] ?? 0);

export const roarStuns = (att, rng) => hasTrait(att, 'thunderRoar') && rng.chance(T.stunChance);
export const dodgeWindow = (dfd) => QTE.dodgeMs * (hasTrait(dfd, 'quickReflexes') ? T.reflexMult : 1);
