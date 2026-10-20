import { MOVES, ENERGY, STREAK, COAST } from '../data/moves.js';
import { RELIC_TUNING as RT } from '../data/relics.js';
import * as BLD from './build.js';
import * as SG from './surge.js';
import { BRAINS, DEFAULT_BRAIN, INTENT_ICONS, MOVE_INTENT_ICONS, PHASE2_AT, RING_ICONS } from '../data/brains.js';
import { zoneTiming, BOSS_RINGS, fatigueMult } from '../data/qteProfiles.js';
import {
  startTurn, endTurn, applyStatus, computeDamage, afterHit, roarStuns, roarTurns
} from './combat.js';

// Pure turn flow for one fight (no Phaser). The Battle scene animates these
// steps; the balance sim calls the same functions with random QTE results.
//
// Round: beginPlayerTurn (energy, intents) → player spends energy on moves →
// END TURN → each enemy runs its intent (enemyAct + enemyStrike per hit) →
// finishEnemyAction → next round.

// build: the run's fossils / mutations / perks (systems/build.js). timing: the
// zone's defend windows and ring odds (data/qteProfiles.js zoneTiming). Call
// startBattle once all enemies are in.
export function createBattle({ player, enemies, rng, spawn = null, build = null, timing = zoneTiming('jungle') }) {
  const st = {
    player, enemies: [], rng, spawn, build: build ?? BLD.emptyBuild(), timing,
    energy: 0, energyNext: 0, streak: 0, turn: 0,
    empowered: false, activeEmpower: false, firstTurn: true,
    fatigue: 0, dodgedPhase: false, counterUsed: false, // dodge fatigue, one counter per enemy phase
    fight: { braces: 0, dmg: 0, moveKills: 0 } // this fight's tallies (goals)
  };
  for (const e of enemies) addEnemy(st, e);
  return st;
}

export function startBattle(st) { BLD.onBattleStart(st); SG.initSurge(st); } // the Primal meter (systems/surge.js)

// Run-long counters for goals (run.stats; none in test fights).
function tally(st, k, n = 1) { const s = st.build.run?.stats; if (s) s[k] = (s[k] ?? 0) + n; }
function tallyMax(st, k, n) { const s = st.build.run?.stats; if (s) s[k] = Math.max(s[k] ?? 0, n); }
const noteKill = (st, killed) => { if (killed) st.fight.moveKills++; };
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
  if (token === 'bask') return { kind: 'heal' };
  if (token === 'spikes') return { kind: 'spikes' };
  return atkIntent(token);
}

const cycleOf = (e) => (e.phase === 2 ? e.brain.phase2.cycle : e.brain.cycle);

// What the enemy will do on its next action. Forced states come first.
export function pickIntent(e) {
  if (e.status.stun > 0) return { kind: 'stunned' };
  if (e.status.charging > 0) return atkIntent(e.chargeMove, { charged: true });
  if (e.status.submerged > 0) return { ...atkIntent(e.brain.ambush ?? 'ambush'), kind: 'ambush' };
  const cycle = cycleOf(e);
  return fromToken(cycle[e.step % cycle.length]);
}

export function rollIntents(st) {
  for (const e of alive(st)) e.intent = decorate(st, e, pickIntent(e));
}

// Attack intents get a timing profile and a red / purple ring flag (a move's own,
// or rolled by the zone). A Plesiosaur sits low in the water unless it's about to lunge.
export function decorate(st, e, intent) {
  if (e.brain.lowWater) e.status.lowWater = intent.move === e.brain.lowWater ? 0 : 1;
  if (!isStrike(intent) && intent.kind !== 'charge') return intent;
  const opts = e.brain.profiles?.[intent.move] ?? 'steady';
  intent.profile = intent.feint ? 'feint' : Array.isArray(opts) ? opts[Math.floor(st.rng.next() * opts.length)] : opts;
  if (e.calm && isStrike(intent)) { intent.profile = 'steady'; intent.feint = false; e.calm = 0; } // Venom Spit
  const odds = e.levelLabel === 'BOSS' ? Math.max(st.timing.rings, BOSS_RINGS) : st.timing.rings;
  if (intent.kind !== 'charge' && MOVES[intent.move].ring) intent.ring = MOVES[intent.move].ring;
  else if (intent.kind !== 'charge' && !MOVES[intent.move].sure && odds > 0 && st.rng.next() < odds) intent.ring = st.rng.next() < st.timing.redShare ? 'red' : 'purple';
  return intent;
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
  const icon = (isStrike(i) && MOVE_INTENT_ICONS[i.move]) || INTENT_ICONS[i.kind];
  return { icon, label: i.feint ? `${label}?` : label, kind: i.kind, ring: i.ring ?? null, ringIcon: RING_ICONS[i.ring] ?? null };
}

/* ---------- player turn ---------- */

export function beginPlayerTurn(st) {
  const p = st.player, first = st.firstTurn;
  const fast = first && alive(st).every((e) => p.spd > e.spd);
  st.turn++;
  if (!st.dodgedPhase) st.fatigue = 0; // a whole enemy phase without a perfect dodge lets fatigue go
  st.dodgedPhase = false;
  const bonus = (fast ? ENERGY.fastStart : 0) + (first ? BLD.firstTurnBonus(st) : 0) + st.energyNext + BLD.turnBonus(st, st.turn);
  const gain = Math.max(0, ENERGY.perTurn + bonus - p.status.drain);
  st.energy = Math.min(BLD.maxEnergy(st), st.energy + gain);
  st.energyNext = 0;
  p.status.drain = 0;
  p.status.braced = 0;
  st.firstTurn = false;
  const volcanic = BLD.onTurnStart(st, first);
  const pearl = BLD.pearlHeal(st);
  const tick = startTurn(p);
  const revived = BLD.tryRevive(st);
  rollIntents(st);
  SG.onPlayerTurn(st); // a Primal Surge turn passes (+1 energy, or it ends)
  return { ...tick, gain, fast, volcanic, pearl, revived };
}

export const moveCost = (st, id) => BLD.moveCost(st, id);

// Fish Hook: while a Baryonyx holds the player, only attacks are allowed.
export const hooked = (st) => st.player.status.hooked > 0 && alive(st).some((e) => e.status.hooking > 0);

// Damage multiplier on an enemy: low in the water (less), holding the player (more).
export const takenMult = (e) => (e.status.lowWater ? COAST.lowMult : 1) * (e.status.hooking ? COAST.hookMult : 1);

// Why a move can't be used right now (null = usable).
export function blocked(st, id) {
  const m = MOVES[id];
  if (st.energy < moveCost(st, id)) return 'NOT ENOUGH ENERGY';
  if (id === 'apex' && !SG.apexReady(st)) return 'ONCE PER SURGE';
  if (m.brace && st.player.status.braced) return 'ALREADY BRACED';
  if ((m.brace || m.status) && hooked(st)) return 'HOOKED: ATTACK ONLY';
  if (!m.status && !m.brace && !targetable(st).length) return 'NO TARGET';
  return null;
}

export const affordable = (st) => st.player.moves.some((id) => !blocked(st, id));

// Spend energy and start a move; empower from a finished crit streak applies now.
export function beginMove(st, id) {
  st.energy -= moveCost(st, id);
  st.fight.moveKills = 0;
  st.moveQtes = 0;
  st.moveAllCrit = true;
  if (id === 'roar') tally(st, 'roars');
  st.activeEmpower = st.empowered && !MOVES[id].status && !MOVES[id].brace;
  if (st.activeEmpower) st.empowered = false;
}

// End of a move. The crit streak counts whole attacks: a move with QTEs adds
// one if every bar in it was a crit, otherwise the streak breaks (so a
// multi-hit special can't farm it). Returns { streakUp } when it completes.
export function endMove(st) {
  tallyMax(st, 'multiKill', st.fight.moveKills);
  st.activeEmpower = false;
  if (!st.moveQtes) return { streakUp: false };
  st.moveQtes = 0;
  if (!st.moveAllCrit) { st.streak = 0; return { streakUp: false }; }
  st.streak++;
  if (st.streak < BLD.streakNeed(st)) return { streakUp: false };
  st.streak = 0;
  st.empowered = true;
  tally(st, 'streaks');
  return { streakUp: true };
}

// Record one QTE result of the current move (see endMove).
export function noteQte(st, qte) {
  tally(st, `bar_${qte}`); // run stats: attack bars by result
  st.moveQtes = (st.moveQtes ?? 0) + 1;
  st.moveAllCrit = (st.moveAllCrit ?? true) && qte === 'crit';
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
  const mult = (st.activeEmpower ? 1 + STREAK.bonus : 1) * mods.mult * takenMult(target) * (qte === 'crit' ? SG.critMult(st) : 1); // surge crits hit harder
  const dmg = Math.min(target.hp, computeDamage(p, target, m, st.rng, { qte, mult }) + mods.flat);
  target.hp -= dmg;
  tally(st, 'dmgDealt', dmg);
  tallyMax(st, 'bestHit', dmg);
  const trait = afterHit(p, target, dmg);
  const fx = BLD.onPlayerHit(st, id, target, qte, dmg);
  const killed = target.hp <= 0;
  const calmed = !!m.calm && !killed && calm(target);
  const defGain = m.critDef && qte === 'crit' ? m.critDef : 0; // Scythe Claws: lasts the fight
  p.def += defGain;
  noteKill(st, killed);
  if (id === 'tail' && dmg > 0) tally(st, 'tailHits');
  // Spiky guard (Stego): the attacker is pricked, but never killed by it.
  const recoil = target.thorns && dmg > 0 ? Math.min(p.hp - 1, Math.max(1, Math.round(dmg * RT.thornsFrac))) : 0;
  p.hp -= recoil;
  return { dmg, killed, trait, fx, recoil, calmed, defGain, kill: killed ? BLD.onKill(st) : null, phase: checkPhase(st, target) };
}

// Venom Spit: the target's next attack loses its timing profile (plain steady, no feint).
// If that attack is already its intent it changes now; otherwise it waits for it.
export function calm(e) {
  if (isStrike(e.intent)) { e.intent.profile = 'steady'; e.intent.feint = false; e.calm = 0; }
  else e.calm = 1;
  return true;
}

// Free riposte after a perfect dodge (no energy, no QTE, no streak).
// Dodge fatigue: the dodge window multiplier for the next ring (data/qteProfiles.js).
export const dodgeFatigue = (st) => fatigueMult(st.fatigue);

// The perfect-dodge counter fires at most once per enemy phase.
export const counterReady = (st) => !st.counterUsed;

export function counterStrike(st, target, qte = 'good') { // qte: 'crit' when aimed at the head (systems/flow.js)
  st.counterUsed = true;
  const mult = BLD.counterMult(st) * takenMult(target);
  const dmg = Math.min(target.hp, computeDamage(st.player, target, MOVES.counter, st.rng, { qte, mult }));
  target.hp -= dmg;
  tally(st, 'dmgDealt', dmg);
  const killed = target.hp <= 0;
  return { dmg, killed, trait: afterHit(st.player, target, dmg), kill: killed ? BLD.onKill(st) : null, phase: checkPhase(st, target) };
}

// Small after-attack extras (Compy King's ghost bite).
export function afterAttack(st, target) {
  const dmg = BLD.ghostBite(st, target);
  if (!dmg) return null;
  const killed = target.hp <= 0;
  noteKill(st, killed);
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
  for (const r of res) { r.killed = r.e.hp <= 0; noteKill(st, r.killed); r.phase = checkPhase(st, r.e); }
  return res;
}

// Returns HP healed (Fern Cushion).
export function playerBrace(st) {
  st.player.status.braced = 1;
  st.fight.braces++;
  st.fatigue = 0; // bracing resets dodge fatigue
  return BLD.onBrace(st);
}

// Muddy attack bar is used up by the next attack.
export function consumeMuddy(st) {
  const m = st.player.status.muddy > 0;
  st.player.status.muddy = 0;
  return m;
}

// Venom Spit: the next attack bar starts hidden. Used up by that attack.
export function consumeBlind(st) {
  const b = st.player.status.blind > 0;
  st.player.status.blind = 0;
  return b;
}

export function endPlayerTurn(st) {
  endTurn(st.player);
  st.player.status.hooked = 0; // the hold lasts one player turn
  st.counterUsed = false; // the enemy phase starts: one counter available
}

/* ---------- enemy phase ---------- */

// Start of an enemy's action: poison and stun. Returns { poison, stunned }.
export function beginEnemyAction(st, e) {
  e.status.guard = 0;
  e.status.hooking = 0; // a Baryonyx lets go when it acts again
  e.thorns = false;
  const tick = startTurn(e);
  if (tick.poison && e.hp <= 0) tally(st, 'poisonKills');
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
  else if (i.kind === 'spikes') { e.status.guard = 1; e.thorns = true; }
  else if (i.kind === 'heal') {
    e.healed = Math.min(e.maxHp - e.hp, Math.round(e.maxHp * RT.baskHeal));
    e.hp += e.healed;
  }
}

export const isStrike = (i) => ['attack', 'multi', 'ambush'].includes(i?.kind);

// One hit of an attack (the intent's move unless given). Bracing turns a
// missed dodge into a block. Ring flags: red can't be dodged (a perfect press
// blocks), purple can't be blocked (and Brace doesn't help).
export const ringOf = (e, moveId) => (moveId === e.intent?.move ? e.intent?.ring ?? null : null);
export function enemyStrike(st, e, defend, moveId = e.intent.move) {
  const p = st.player, m = MOVES[moveId], ring = ringOf(e, moveId);
  let d = defend;
  if (ring === 'red' && d === 'dodge') d = 'block';
  if (ring === 'purple' && d === 'block') d = 'hit';
  if (d === 'hit' && p.status.braced && ring !== 'purple') d = 'block';
  const kelp = ring === 'purple' && d === 'hit' && BLD.kelpBlock(st);
  const dmg = kelp ? 0 : BLD.reduceHit(st, computeDamage(e, p, m, null, { qte: 'good', defend: d, blockMult: BLD.blockMult(st, m) }));
  if (ring === 'purple' && d === 'hit' && dmg > 0) tally(st, `purpleHits_${st.build.run?.zone}`); // Dry Feet
  p.hp = Math.max(0, p.hp - dmg);
  const stunned = !!m.stunOnHit && d === 'hit' && dmg > 0 && p.hp > 0; // Club Swing
  if (stunned) p.status.stun = 1;
  const healed = d === 'dodge' ? BLD.onDodge(st) : 0;
  afterHit(e, p, dmg);
  st.fight.dmg += dmg;
  tally(st, 'dmgTaken', dmg);
  tally(st, `ring_${defend}`); // run stats: what the press itself was (before rings / Brace convert it)
  if (d === 'dodge') { tally(st, 'dodges'); st.fatigue++; st.dodgedPhase = true; }
  else if (d === 'hit' && dmg > 0) st.fatigue = 0; // getting hit resets fatigue
  if (d === 'block' && p.status.braced) tally(st, 'blocks');
  const drained = !!m.drain && d === 'hit';
  if (drained) p.status.drain += m.drain;
  // Tidal Coast: anything but a perfect dodge lets Venom Spit blind and Fish Hook grab.
  const blinded = !!m.blinds && d !== 'dodge' && p.hp > 0;
  if (blinded) p.status.blind = 1;
  const grabbed = !!m.hooks && d !== 'dodge' && p.hp > 0;
  if (grabbed) { p.status.hooked = 1; e.status.hooking = 1; }
  const reflect = BLD.onEnemyHit(st, e, d, dmg);
  const revived = BLD.tryRevive(st);
  return { dmg, defend: d, drained, reflect, revived, stunned, healed, blinded, grabbed, kelp };
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
  if (!p2 || e.phase !== 1 || e.hp <= 0 || e.hp > e.maxHp * PHASE2_AT || SG.active(st)) return null; // STAGGER: phase 2 waits for the surge to end
  e.phase = 2;
  e.step = 0;
  e.tellMult = p2.tellMult ?? 1;
  let minion = null;
  if (p2.summon && st.spawn) minion = st.spawn(p2.summon);
  if (minion) minion.intent = decorate(st, minion, pickIntent(minion));
  return { line: p2.line, minion };
}
