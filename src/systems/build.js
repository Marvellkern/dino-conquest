import { MOVES, ENERGY, STREAK, DEFEND_MULT } from '../data/moves.js';
import { RELIC_TUNING as RT } from '../data/relics.js';
import { MUTATION_TUNING as MT } from '../data/mutations.js';

// Effects of the run's build: fossils (relics), evolution perks and move
// mutations. battleState.js calls these hooks; nothing here knows about Phaser.
// st.build = { relics: Set<id>, mut: { bite?, tail?, roar? }, run? }

export const emptyBuild = () => ({ relics: new Set(), mut: {} });
export const has = (st, id) => !!st.build?.relics.has(id);
export const mutation = (st, move) => st.build?.mut?.[move] ?? null;

const heal = (f, n) => { const h = Math.min(n, f.maxHp - f.hp); f.hp += h; return h; };
const aliveCount = (st) => st.enemies.filter((e) => e.hp > 0).length;

/* ---------- numbers the rules ask for ---------- */

export const maxEnergy = (st) => ENERGY.max + (has(st, 'volcanicHeart') ? 1 : 0) + (has(st, 'perkSailback') ? 1 : 0);

export function moveCost(st, id) {
  if (id === 'roar' && has(st, 'boneDrum')) return 0;
  if (id === 'brace' && has(st, 'meteorIron')) return 0;
  if (id === 'clubSmash' && has(st, 'perkClubber')) return 1;
  if (id === 'goreRush' && has(st, 'perkBullhorn')) return 1;
  if (id === 'crushingBite' && has(st, 'perkTyrant')) return 2;
  if (id === 'skullBash' && has(st, 'perkCrusher')) return 1;
  return MOVES[id].cost ?? 1;
}

export const streakNeed = (st) => (has(st, 'glowShard') ? 2 : STREAK.need);
export const spreadCount = (st, m) => m.spread + (m.id === 'swarm' && has(st, 'perkSwarmlord') ? 1 : 0);

// Moves that hit every enemy at once (one QTE).
export const hitsAll = (st, id) =>
  (id === 'tail' && mutation(st, 'tail') === 'sweep') || (id === 'hornCharge' && has(st, 'perkWarhorn'))
  || (id === 'swampSurge' && has(st, 'perkTidelord')) || (id === 'diveBomb' && has(st, 'perkStorm'))
  || (id === 'thagomizer' && has(st, 'perkThago'));

export const counterMult = (st) => (has(st, 'raptorClaw') ? RT.raptorClawMult / MOVES.counter.power : 1) * (has(st, 'perkShadow') ? RT.shadowMult : 1);
export const dodgeMult = (st) => (has(st, 'swiftFeather') ? RT.swiftMult : 1) * (has(st, 'perkFeathers') ? RT.feathersMult : 1)
  * (has(st, 'perkSky') ? RT.skyMult : 1);

// Damage taken by the player on a block.
export function blockMult(st, m) {
  let b = m.blockMult ?? DEFEND_MULT.block;
  if (has(st, 'mossyShell')) b = Math.min(b, RT.mossyBlock);
  if (has(st, 'perkFrill') && st.player.status.braced) b = Math.min(b, RT.frillBlock);
  return b;
}

// Multiplier and flat bonus on a player strike.
export function strikeMods(st, id, target) {
  let mult = 1;
  if (id === 'bite' && has(st, 'sharpStone')) mult *= RT.sharpStoneMult;
  if (has(st, 'huntersEye') && target.hp < target.maxHp * RT.huntersBelow) mult *= RT.huntersMult;
  if (id === 'tail' && has(st, 'twinHorn')) mult *= RT.twinHornMult;
  if (MOVES[id].execute && target.hp < target.maxHp / 2) mult *= 1 + MOVES[id].execute;
  const flat = (has(st, 'packTotem') ? RT.packTotemDmg * aliveCount(st) : 0) + (has(st, 'emberCore') ? RT.emberDmg : 0);
  return { mult, flat };
}

/* ---------- event hooks ---------- */

// Fight begins (after all enemies are in).
export function onBattleStart(st) {
  if (has(st, 'tarPitStone')) for (const e of st.enemies) applyPoison(st, e, RT.tarPitPoison);
  st.autoCrit = has(st, 'meteorChip');
  st.ashCloak = has(st, 'ashCloak');
}

// Extra energy at the start of turn n (1-based): Star Shard every 3rd turn.
export const turnBonus = (st, n) => (has(st, 'starShard') && n % RT.starEvery === 0 ? 1 : 0);

// Damage the player takes from one enemy hit, after Ash Cloak / Obsidian Scale.
export function reduceHit(st, dmg) {
  if (dmg <= 0) return dmg;
  if (st.ashCloak) { st.ashCloak = false; return 0; }
  return has(st, 'obsidianScale') ? Math.max(1, dmg - RT.obsidianArmor) : dmg;
}

// A perfect dodge: Ptera Bone heals.
export const onDodge = (st) => (has(st, 'pteraBone') ? heal(st.player, RT.pteraHeal) : 0);

// Banked Amber from fights (Amber Geode). build: a run build (works without a battle).
export const amberMult = (build) => (build?.relics?.has('amberGeode') ? RT.geodeMult : 1);

// Start of the player's turn. Returns HP lost to Volcanic Heart.
export function onTurnStart(st, first) {
  const p = st.player;
  if (first && has(st, 'perkBogTyrant')) p.status.braced = 1;
  if (!has(st, 'volcanicHeart')) return 0;
  const dmg = Math.min(RT.volcanicDmg, p.hp - 1); // it never kills
  p.hp -= dmg;
  return dmg;
}

export const firstTurnBonus = (st) => (has(st, 'stormEgg') ? 1 : 0);

export function applyPoison(st, e, turns) {
  e.status.poison = Math.max(e.status.poison, turns);
  if (has(st, 'venomGland')) e.poisonBonus = RT.venomGlandBonus;
}

// After a player strike lands on target. Returns { healed, poisoned, stunned, chain }.
export function onPlayerHit(st, id, target, qte, dmg) {
  const p = st.player, out = { healed: 0, poisoned: false, stunned: false, chain: false };
  const m = mutation(st, id), crit = qte === 'crit';
  if (crit && has(st, 'amberFang')) out.healed += heal(p, RT.amberFangHeal);
  if (id === 'bite' && m === 'leech') out.healed += heal(p, Math.round(dmg * MT.leech));
  if (target.hp > 0) {
    const poison = (id === 'bite' && m === 'venom' ? MT.venomPoison : 0) || (id === 'tail' && has(st, 'tailSpike') ? 1 : 0)
      || (id === 'deathRoll' && has(st, 'perkDeathjaw') ? 2 : 0) || (MOVES[id].poison ?? 0)
      || (crit && has(st, 'lavaFang') ? RT.lavaPoison : 0);
    if (poison) { applyPoison(st, target, poison); out.poisoned = true; }
    if (crit && ((id === 'tail' && m === 'stun') || (id === 'skullBash' && has(st, 'perkBonehead')) || MOVES[id].critStun)) {
      target.status.stun = 1;
      target.intent = { kind: 'stunned' };
      out.stunned = true;
    }
  }
  out.chain = id === 'bite' && m === 'chain' && crit;
  // Poison from the Venom Bite trait also gets the Venom Gland bonus.
  if (target.status.poison > 0 && has(st, 'venomGland')) target.poisonBonus = RT.venomGlandBonus;
  return out;
}

// An enemy died to the player. Returns { healed, energy }.
export function onKill(st) {
  const out = { healed: 0, energy: 0 };
  if (has(st, 'bloodAmber')) out.healed = heal(st.player, RT.bloodAmberHeal);
  if (has(st, 'perkAlpha') || has(st, 'perkDoom')) { out.energy = 1; st.energy = Math.min(maxEnergy(st), st.energy + 1); }
  return out;
}

export function onBrace(st) {
  if (has(st, 'perkBastion')) st.player.status.defUp = Math.max(st.player.status.defUp ?? 0, RT.bastionTurns);
  return has(st, 'fernCushion') ? heal(st.player, RT.fernHeal) : 0;
}

// An enemy hit the player. Thick Skull reflects part of a braced block.
export function onEnemyHit(st, e, d, dmg) {
  const spiky = has(st, 'thickSkull') || has(st, 'perkSpikes');
  if (!(spiky && st.player.status.braced && d === 'block' && dmg > 0)) return 0;
  const back = Math.max(1, Math.round(dmg * Math.max(has(st, 'thickSkull') ? RT.thickSkullReflect : 0, has(st, 'perkSpikes') ? RT.spikesReflect : 0)));
  e.hp = Math.max(0, e.hp - back);
  return back;
}

// Roar side effects. Returns [{ e, dmg, cancelled }].
export function onRoar(st) {
  const terror = mutation(st, 'roar') === 'terror';
  if (mutation(st, 'roar') === 'rally') st.energyNext = (st.energyNext ?? 0) + 1;
  return st.enemies.filter((e) => e.hp > 0).map((e) => {
    let dmg = 0, cancelled = false;
    if (has(st, 'echoRock')) { dmg = Math.min(e.hp, RT.echoDmg); e.hp -= dmg; }
    if (terror && (e.status.charging > 0 || e.intent?.kind === 'charge')) {
      e.status.charging = 0;
      e.status.stun = 1;
      e.intent = { kind: 'stunned' };
      cancelled = true;
    }
    return { e, dmg, cancelled };
  });
}

// Compy King's ghost bites the target after each attack move.
export function ghostBite(st, target) {
  if (!has(st, 'perkKing') || !target || target.hp <= 0) return 0;
  const dmg = Math.min(target.hp, RT.ghostBite);
  target.hp -= dmg;
  return dmg;
}

// Old Egg: survive one lethal blow per run at 30% HP.
export function tryRevive(st) {
  const p = st.player, b = st.build;
  if (p.hp > 0 || !has(st, 'oldEgg') || b.eggUsed || b.run?.eggUsed) return false;
  b.eggUsed = true;
  if (b.run) b.run.eggUsed = true;
  p.hp = Math.max(1, Math.round(p.maxHp * RT.oldEggHp));
  return true;
}
