import { MOVES, QTE } from '../data/moves.js';
import { dodgeWindow } from '../systems/combat.js';
import * as B from '../systems/battleState.js';
import { dodgeMult } from '../systems/build.js';
import { defendRing } from '../systems/qte.js';
import { sfx } from '../systems/sfx.js';
import { animSet, roar, chargeUp, wait } from './anims.js';
import './anims2.js'; // spit + claws sets
import { defendAnim, submergeAnim, surfaceAnim, floodAnim } from './gimmicks.js';
import { hitFeedback } from './feedback.js';
import { rollTiming, MIN_DODGE_MS } from '../data/qteProfiles.js';
import { VARIANTS } from '../data/variants.js';

// One enemy's action during the enemy phase, exactly as its intent showed.
export async function enemyAction(scene, e) {
  const st = scene.st, p = st.player, rig = e.rig;
  const tick = B.beginEnemyAction(st, e);
  if (tick.poison) {
    const t = rig.hitPoint();
    rig.flash(50);
    scene.fx.number(t.x, t.y - 16, tick.poison, { color: '#80d060' });
    sfx('weak');
    await wait(scene, 350);
    if (e.hp <= 0) { scene.afterDamage(e, { killed: true }); await scene.settle(); return; }
  }
  const i = e.intent;
  if (i.kind === 'stunned') {
    const t = rig.top();
    scene.fx.pop(t.x, t.y, 'ZZZ', '#fff096', 1, 700);
    await wait(scene, 600);
    B.finishEnemyAction(st, e);
    return;
  }

  if (e.status.stagger > 0 && i.kind === 'charge') { // a Primal Surge staggers a boss: its charge-up is skipped
    e.status.stagger = 0;
    const t = rig.top();
    scene.fx.pop(t.x, t.y, 'STAGGERED!', '#ffd040', 1, 800);
    rig.flash(60);
    await wait(scene, 650);
    B.finishEnemyAction(st, e);
    return;
  }
  rig.stopIdle();
  rig.c.setDepth(7);
  B.enemyAct(st, e);
  if (i.kind === 'defend') { scene.say(`${e.name} GUARDS`); await defendAnim(scene, rig); }
  else if (i.kind === 'charge') {
    scene.say(`${e.name} IS CHARGING ${MOVES[i.move].name.toUpperCase()}!`);
    await chargeUp(scene, rig);
  } else if (i.kind === 'submerge') { scene.say(`${e.name} DIVES UNDER`); await submergeAnim(scene, rig); }
  else if (i.kind === 'debuff') {
    scene.say(`${e.name} ROARS`);
    await roar(scene, rig, () => { const t = p.rig.top(); scene.fx.pop(t.x, t.y, 'ATK DOWN', '#e06060', 1, 900); });
  } else if (i.kind === 'flood') { scene.say(`${e.name} FLOODS THE ARENA`); await floodAnim(scene, !!p.status.braced); }
  else if (i.kind === 'spikes') { scene.say(`${e.name} RAISES ITS SPIKES`); await defendAnim(scene, rig); }
  else if (i.kind === 'heal') {
    scene.say(`${e.name} BASKS IN THE HEAT`);
    const t = rig.top();
    scene.fx.sparks(t.x, t.y + 8, { count: 12, big: true, gold: true });
    if (e.healed) scene.fx.number(t.x, t.y, `+${e.healed}`, { color: '#80d060' });
    sfx('levelup');
    await wait(scene, 650);
  }
  else {
    if (i.kind === 'ambush' && i.move === 'breach') { const c = rig.center(); scene.lighting?.breach(c.x, c.y); } // dark, then a splash of light
    if (i.kind === 'ambush') { scene.say(i.move === 'ambush' ? `${e.name} AMBUSHES!` : `${e.name}: ${MOVES[i.move].name.toUpperCase()}!`); await surfaceAnim(scene, rig); }
    else scene.say(`${e.name}: ${MOVES[i.move].name.toUpperCase()}`);
    await enemyAttack(scene, e, i.move, { feint: !!i.feint });
  }
  if (!e.status.submerged && e.hp > 0) resetRig(rig); // a dead attacker (the counter killed it) dissolves where it stands
  rig.c.setDepth(5);

  B.finishEnemyAction(st, e);
}

function resetRig(rig) {
  rig.setPose({});
  rig.setFacing(rig.homeFacing);
  rig.x = rig.homeX;
  rig.y = rig.homeY;
  rig.c.setAlpha(1);
  rig.startIdle();
}

// Animated enemy attack with the defend ring. A perfect dodge earns the counter (battle/flow.js:
// calm, aim, a fast riposte) before the attacker heads home. Returns true if any hit was dodged.
export async function enemyAttack(scene, e, moveId, { feint = false } = {}) {
  const st = scene.st, m = MOVES[moveId], p = st.player, set = animSet(e.species, m.anim);
  let dodged = false;
  scene.lighting?.moveStart(moveId, e.rig.x); // Starfall: light from the sky
  if (set.approach) await set.approach(scene, e.rig, p.rig);
  const hits = m.hits ?? 1;
  for (let h = 0; h < hits && p.hp > 0 && e.hp > 0; h++) {
    await set.strike(scene, e.rig, p.rig, defendCtx(scene, e, moveId, h, feint, (r) => {
      if (r.defend === 'dodge') dodged = true;
      scene.flow?.defended(e, r.defend, h === hits - 1 || p.hp <= 0 || e.hp <= 0);
    }));
  }
  const pick = await scene.flow?.settle(e, dodged);
  if (pick) await scene.flow.counter(pick);
  if (set.retreat && p.hp > 0 && e.hp > 0) await set.retreat(scene, e.rig);
  return dodged;
}

// Defend wiring for one hit: the timing profile is rolled per hit (seeded),
// windows come from the zone (st.timing), the ring flag from the intent.
function defendCtx(scene, e, moveId, h, feint, onHit) {
  const st = scene.st, m = MOVES[moveId], p = st.player, tight = m.tight ?? 1;
  const own = moveId === e.intent?.move;
  const profile = own ? e.intent.profile ?? 'steady' : (e.brain.profiles?.[moveId] ?? 'snap');
  const flag = B.ringOf(e, moveId);
  let ring = null;
  return {
    isPlayer: false,
    hit: h,
    tellMult: e.tellMult * (st.build.run?.mods?.tell ?? 1) * (e.status.slow > 0 ? VARIANTS.frost.perk.slowTell : 1), // Extinction 2+: faster wind-ups; SLOW (Frost): slower
    timing: rollTiming(st.rng, Array.isArray(profile) ? profile[0] : profile, h),
    open: (leadMs = 0, shape = {}) => {
      if (ring) return;
      const c = p.rig.center();
      ring = defendRing(scene, {
        x: c.x, y: c.y, leadMs, noDodge: !!m.sure, ring: flag, ...shape,
        dodgeMs: Math.max(MIN_DODGE_MS, dodgeWindow(p, st.timing.dodgeMs) * dodgeMult(st) * tight * B.dodgeFatigue(st)),
        fatigue: st.fatigue,
        blockMs: st.timing.blockMs * (tight < 1 ? 0.8 : 1)
      });
    },
    result: () => ring,
    impact: (res) => {
      const r = B.enemyStrike(st, e, res, moveId);
      scene.lastHitBy = e.name;
      hitFeedback(scene, e, p, r.dmg, 'good', r.defend, 0, { move: moveId });
      if (r.drained) { const t = p.rig.top(); scene.fx.pop(t.x, t.y - 12, '-1 ENERGY', '#e0a040', 1, 900); }
      if (r.reflect) { const t = e.rig.hitPoint(); scene.fx.number(t.x, t.y - 8, r.reflect, { color: '#9ab8ff' }); e.rig.flash(40); scene.afterDamage(e, { killed: e.hp <= 0 }); }
      if (r.revived) scene.revivePop();
      if (r.stunned) { const t = p.rig.top(); scene.fx.pop(t.x, t.y - 12, 'STUNNED!', '#fff096', 1, 900); }
      if (r.healed) { const t = p.rig.top(); scene.fx.number(t.x, t.y, `+${r.healed}`, { color: '#80d060' }); }
      if (r.kelp) { const t = p.rig.top(); scene.fx.pop(t.x, t.y - 12, 'KELP WRAP!', '#63c74d', 1, 900); }
      if (r.blinded) { const t = p.rig.top(); scene.fx.pop(t.x, t.y - 12, 'BLINDED!', '#c070ff', 1, 900); }
      if (r.grabbed) { const t = p.rig.top(); scene.fx.pop(t.x, t.y - 12, 'HOOKED!', '#ff6040', 1, 900); }
      onHit(r);
    }
  };
}

// Raptor gimmick: after evading a missed attack it gets a free quick Pounce.
export async function evadePounce(scene, e) {
  const rig = e.rig;
  scene.say(`${e.name} POUNCES BACK!`);
  rig.stopIdle();
  rig.c.setDepth(7);
  await enemyAttack(scene, e, 'pounce');
  resetRig(rig);
  rig.c.setDepth(5);
  await scene.settle();
}
