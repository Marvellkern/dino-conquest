import { MOVES, ENERGY, STREAK } from '../data/moves.js';
import * as BLD from './build.js';
import { BRAINS, DEFAULT_BRAIN, INTENT_ICONS, PHASE2_AT } from '../data/brains.js';
import {
  startTurn, endTurn, applyStatus, computeDamage, afterHit, roarStuns, roarTurns
} from './combat.js';

// Pure turn flow for one fight (no Phaser). The Battle scene animates these
// steps; the balance sim calls the same functions with random QTE results.
//
// Round: beginPlayerTurn (energy, intents) → player spends energy on moves →
// END TURN → each enemy runs its intent (enemyAct + enemyStrike per hit) →
// finishEnemyAction → next round.

// build: the run's fossils / mutations / perks (systems/build.js). Call
// startBattle once all enemies are in.
export function createBattle({ player, enemies, rng, spawn = null, build = null }) {
  const st = {
    player, enemies: [], rng, spawn, build: build ?? BLD.emptyBuild(),
    energy: 0, energyNext: 0, streak: 0, empowered: false, pendingEmpower: false, activeEmpower: false, firstTurn: true
  };
  for (const e of enemies) addEnemy(st, e);
  return st;
}

export function startBattle(st) { BLD.onBattleStart(st); }
export const maxEnergy = (st) => BLD.maxEnergy(st);

export function addEnemy(st, e, brainId = e.brainId ?? e.species) {
  const brain = BRAINS[brainId] ?? DEFAULT_BRAIN;
  Object.assign(e, { brain, step: 0, phase: 1, intent: null, armorCharging: !!brain.armorCharging, tellMult: 1 });
  st.enemies.push(e);
  return e;
}

export const alive = (st) => st.enemies.filter((e) => e.hp > 0);
export const targetable = (st) => alive(st).filter((e) => !e.status.submerged);
export const won = (st) => alive(st).length === 0;
export const lost = (st) => st.player.hp <= 0;

/* ---------- intents ---------- */

function atkIntent(move, extra = {}) {
  const hits = MOVES[move].hits ?? 1;
  return { kind: hits > 1 ? 'multi' : 'attack', move, hits, ...extra };
}

function fromToken(token) {
  if (token === 'feint') return atkIntent('bite', { feint: true });
  if (token.startsWith('charge:')) return { kind: 'charge', move: token.slice(7), hits: 1 };
  if (token === 'defend') return { kind: 'defend' };
  if (token === 'roar') return { kind: 'debuff', move: 'roar' };
  if (token === 'submerge') return { kind: 'submerge' };
  if (token === 'flood') return { kind: 'flood', move: 'flood' };
  return atkIntent(token);
}

const cycleOf = (e) => (e.phase === 2 ? e.brain.phase2.cycle : e.brain.cycle);

// What the enemy will do on its next action. Forced states come first.
export function pickIntent(e) {
  if (e.status.stun > 0) return { kind: 'stunned' };
  if (e.status.charging > 0) return atkIntent(e.chargeMove, { charged: true });
  if (e.status.submerged > 0) return { ...atkIntent('ambush'), kind: 'ambush' };
  const cycle = cycleOf(e);
  return fromToken(cycle[e.step % cycle.length]);
}

export function rollIntents(st) {
  for (const e of alive(st)) e.intent = pickIntent(e);
}

// Exact damage per hit on a clean (unblocked) hit, with current statuses.
export function intentDamage(st, e) {
  const i = e.intent;
  if (!i?.move || MOVES[i.move].status) return 0;
  return computeDamage(e, st.player, MOVES[i.move], null, { qte: 'good', defend: 'hit' });
}

// Icon key + label shown above the enemy.
export function intentView(st, e) {
  const i = e.intent;
  if (!i) return null;
  const d = intentDamage(st, e);
  const label = i.kind === 'multi' ? `${d}X${i.hits}` : d ? String(d) : '';
  return { icon: INTENT_ICONS[i.kind], label: i.feint ? `${label}?` : label, kind: i.kind };
}

/* ---------- player turn ---------- */

export function beginPlayerTurn(st) {
  const p = st.player, first = st.firstTurn;
  const fast = first && alive(st).every((e) => p.spd > e.spd);
  const bonus = (fast ? ENERGY.fastStart : 0) + (first ? BLD.firstTurnBonus(st) : 0) + st.energyNext;
  const gain = Math.max(0, ENERGY.perTurn + bonus - p.status.drain);
  st.energy = Math.min(BLD.maxEnergy(st), st.energy + gain);
  st.energyNext = 0;
  p.status.drain = 0;
  p.status.braced = 0;
  st.firstTurn = false;
  const volcanic = BLD.onTurnStart(st, first);
  const tick = startTurn(p);
  const revived = BLD.tryRevive(st);
  rollIntents(st);
  return { ...tick, gain, fast, volcanic, revived };
}

export const moveCost = (st, id) => BLD.moveCost(st, id);

// Why a move can't be used right now (null = usable).
export function blocked(st, id) {
  const m = MOVES[id];
  if (st.energy < moveCost(st, id)) return 'NOT ENOUGH ENERGY';
  if (m.brace && st.player.status.braced) return 'ALREADY BRACED';
  if (!m.status && !m.brace && !targetable(st).length) return 'NO TARGET';
  return null;
}

export const affordable = (st) => st.player.moves.some((id) => !blocked(st, id));

// Spend energy and start a move; empower from a finished crit streak applies now.
export function beginMove(st, id) {
  st.energy -= moveCost(st, id);
  st.activeEmpower = st.empowered && !MOVES[id].status && !MOVES[id].brace;
  if (st.activeEmpower) st.empowered = false;
}

export function endMove(st) {
  if (st.pendingEmpower) { st.empowered = true; st.pendingEmpower = false; }
  st.activeEmpower = false;
}

// Track crits. Returns true when this crit completes a streak.
export function noteQte(st, qte) {
  if (qte !== 'crit') { st.streak = 0; return false; }
  st.streak++;
  if (st.streak < BLD.streakNeed(st)) return false;
  st.streak = 0;
  st.pendingEmpower = true;
  return true;
}

// Meteor Chip: the first attack of the fight is a crit whatever the QTE said.
// Call once per QTE, before resolving its strikes.
export function finalQte(st, qte) {
  if (!st.autoCrit) return { qte, auto: false };
  st.autoCrit = false;
  return { qte: 'crit', auto: true };
}

// Resolve one player strike on target. evaded: a Raptor dodged a missed QTE
// and gets a free Pounce. fx: build effects (heal, poison, stun, chain).
// kill: on-kill effects. phase: a boss just crossed into phase 2.
export function playerStrike(st, id, target, qte) {
  const m = MOVES[id], p = st.player;
  if (qte === 'miss' && target.brain.evadeMiss && !m.sure) return { dmg: 0, evaded: true };
  const mods = BLD.strikeMods(st, id, target);
  const mult = (st.activeEmpower ? 1 + STREAK.bonus : 1) * mods.mult;
  const dmg = Math.min(target.hp, computeDamage(p, target, m, st.rng, { qte, mult }) + mods.flat);
  target.hp -= dmg;
  const trait = afterHit(p, target, dmg);
  const fx = BLD.onPlayerHit(st, id, target, qte, dmg);
  const killed = target.hp <= 0;
  return { dmg, killed, trait, fx, kill: killed ? BLD.onKill(st) : null, phase: checkPhase(st, target) };
}

// Free riposte after a perfect dodge (no energy, no QTE, no streak).
export function counterStrike(st, target) {
  const mult = BLD.counterMult(st);
  const dmg = Math.min(target.hp, computeDamage(st.player, target, MOVES.counter, st.rng, { qte: 'good', mult }));
  target.hp -= dmg;
  const killed = target.hp <= 0;
  return { dmg, killed, trait: afterHit(st.player, target, dmg), kill: killed ? BLD.onKill(st) : null, phase: checkPhase(st, target) };
}

// Small after-attack extras (Compy King's ghost bite).
export function afterAttack(st, target) {
  const dmg = BLD.ghostBite(st, target);
  if (!dmg) return null;
  const killed = target.hp <= 0;
  return { dmg, killed, kill: killed ? BLD.onKill(st) : null, phase: checkPhase(st, target) };
}

// Roar hits every enemy. Returns [{ e, stunned, dmg, cancelled, killed, phase }].
export function playerRoar(st) {
  const m = MOVES.roar;
  const res = alive(st).map((e) => {
    applyStatus(e, { stat: m.effect.stat, turns: roarTurns(st.player, m) });
    const stunned = roarStuns(st.player, st.rng);
    if (stunned) { e.status.stun = 1; e.intent = { kind: 'stunned' }; }
    return { e, stunned, dmg: 0, cancelled: false };
  });
  for (const r of BLD.onRoar(st)) Object.assign(res.find((x) => x.e === r.e), { dmg: r.dmg, cancelled: r.cancelled });
  for (const r of res) { r.killed = r.e.hp <= 0; r.phase = checkPhase(st, r.e); }
  return res;
}

// Returns HP healed (Fern Cushion).
export function playerBrace(st) {
  st.player.status.braced = 1;
  return BLD.onBrace(st);
}

// Muddy attack bar is used up by the next attack.
export function consumeMuddy(st) {
  const m = st.player.status.muddy > 0;
  st.player.status.muddy = 0;
  return m;
}

export function endPlayerTurn(st) { endTurn(st.player); }

/* ---------- enemy phase ---------- */

// Start of an enemy's action: poison and stun. Returns { poison, stunned }.
export function beginEnemyAction(st, e) {
  e.status.guard = 0;
  const tick = startTurn(e);
  if (tick.stunned) e.intent = { kind: 'stunned' };
  return tick;
}

// Non-damage effects of the intent (charging, diving, flooding...).
export function enemyAct(st, e) {
  const i = e.intent, p = st.player;
  if (i.kind === 'defend') e.status.guard = 1;
  else if (i.kind === 'charge') { e.status.charging = 1; e.chargeMove = i.move; }
  else if (i.kind === 'submerge') e.status.submerged = 1;
  else if (i.kind === 'debuff') applyStatus(p, { stat: 'atkDown', turns: 2 });
  else if (i.kind === 'flood' && !p.status.braced) p.status.muddy = 1;
}

export const isStrike = (i) => ['attack', 'multi', 'ambush'].includes(i?.kind);

// One hit of an attack (the intent's move unless given). Bracing turns a
// missed dodge into a block.
export function enemyStrike(st, e, defend, moveId = e.intent.move) {
  const p = st.player, m = MOVES[moveId];
  const d = defend === 'hit' && p.status.braced ? 'block' : defend;
  const dmg = computeDamage(e, p, m, null, { qte: 'good', defend: d, blockMult: BLD.blockMult(st, m) });
  p.hp = Math.max(0, p.hp - dmg);
  afterHit(e, p, dmg);
  const drained = !!m.drain && d === 'hit';
  if (drained) p.status.drain += m.drain;
  const reflect = BLD.onEnemyHit(st, e, d, dmg);
  const revived = BLD.tryRevive(st);
  return { dmg, defend: d, drained, reflect, revived };
}

// After the action: advance the cycle, clear one-shot states.
export function finishEnemyAction(st, e) {
  const i = e.intent;
  if (i.charged) e.status.charging = 0;
  else if (i.kind === 'ambush') e.status.submerged = 0;
  else if (i.kind !== 'stunned') e.step++;
  endTurn(e);
}

/* ---------- bosses ---------- */

// First time a boss drops to PHASE2_AT: switch cycle, speed up, maybe summon.
export function checkPhase(st, e) {
  const p2 = e.brain.phase2;
  if (!p2 || e.phase !== 1 || e.hp <= 0 || e.hp > e.maxHp * PHASE2_AT) return null;
  e.phase = 2;
  e.step = 0;
  e.tellMult = p2.tellMult ?? 1;
  let minion = null;
  if (p2.summon && st.spawn) minion = st.spawn(p2.summon);
  if (minion) minion.intent = pickIntent(minion);
  return { line: p2.line, minion };
}
