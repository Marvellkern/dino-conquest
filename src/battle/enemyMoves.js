import { MOVES, QTE } from '../data/moves.js';
import { dodgeWindow } from '../systems/combat.js';
import * as B from '../systems/battleState.js';
import { dodgeMult } from '../systems/build.js';
import { defendRing } from '../systems/qte.js';
import { sfx } from '../systems/sfx.js';
import { animSet, roar, chargeUp, wait } from './anims.js';
import { defendAnim, submergeAnim, surfaceAnim, floodAnim } from './gimmicks.js';
import { hitFeedback, traitFeedback } from './feedback.js';

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

  rig.stopIdle();
  rig.c.setDepth(7);
  B.enemyAct(st, e);
  let dodged = false;
  if (i.kind === 'defend') { scene.say(`${e.name} GUARDS`); await defendAnim(scene, rig); }
  else if (i.kind === 'charge') {
    scene.say(`${e.name} IS CHARGING ${MOVES[i.move].name.toUpperCase()}!`);
    await chargeUp(scene, rig);
  } else if (i.kind === 'submerge') { scene.say(`${e.name} DIVES UNDER`); await submergeAnim(scene, rig); }
  else if (i.kind === 'debuff') {
    scene.say(`${e.name} ROARS`);
    await roar(scene, rig, () => { const t = p.rig.top(); scene.fx.pop(t.x, t.y, 'ATK DOWN', '#e06060', 1, 900); });
  } else if (i.kind === 'flood') { scene.say(`${e.name} FLOODS THE ARENA`); await floodAnim(scene, !!p.status.braced); }
  else {
    if (i.kind === 'ambush') { scene.say(`${e.name} AMBUSHES!`); await surfaceAnim(scene, rig); }
    else scene.say(`${e.name}: ${MOVES[i.move].name.toUpperCase()}`);
    dodged = await enemyAttack(scene, e, i.move, { feint: !!i.feint });
  }
  if (!e.status.submerged) resetRig(rig);
  rig.c.setDepth(5);

  if (dodged && e.hp > 0 && p.hp > 0 && !e.status.submerged) await counterAttack(scene, e);
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

// Animated enemy attack with the defend ring. Returns true if any hit was perfectly dodged.
export async function enemyAttack(scene, e, moveId, { feint = false } = {}) {
  const st = scene.st, m = MOVES[moveId], p = st.player, set = animSet(e.species, m.anim);
  let dodged = false;
  if (set.approach) await set.approach(scene, e.rig, p.rig);
  for (let h = 0; h < (m.hits ?? 1) && p.hp > 0 && e.hp > 0; h++) {
    await set.strike(scene, e.rig, p.rig, defendCtx(scene, e, moveId, h, feint, (r) => { if (r.defend === 'dodge') dodged = true; }));
  }
  if (set.retreat && p.hp > 0) await set.retreat(scene, e.rig);
  return dodged;
}

function defendCtx(scene, e, moveId, h, feint, onHit) {
  const st = scene.st, m = MOVES[moveId], p = st.player, tight = m.tight ?? 1;
  let ring = null;
  return {
    isPlayer: false,
    hit: h,
    tellMult: e.tellMult,
    feint: feint && h === 0,
    open: (leadMs = 0) => {
      if (ring) return;
      const c = p.rig.center();
      ring = defendRing(scene, {
        x: c.x, y: c.y, leadMs, noDodge: !!m.sure,
        dodgeMs: dodgeWindow(p) * dodgeMult(st) * tight, blockMs: QTE.blockMs * (tight < 1 ? 0.8 : 1)
      });
    },
    result: () => ring,
    impact: (res) => {
      const r = B.enemyStrike(st, e, res, moveId);
      scene.lastHitBy = e.name;
      hitFeedback(scene, e, p, r.dmg, 'good', r.defend, 0);
      if (r.drained) { const t = p.rig.top(); scene.fx.pop(t.x, t.y - 12, '-1 ENERGY', '#e0a040', 1, 900); }
      if (r.reflect) { const t = e.rig.hitPoint(); scene.fx.number(t.x, t.y - 8, r.reflect, { color: '#9ab8ff' }); e.rig.flash(40); scene.afterDamage(e, { killed: e.hp <= 0 }); }
      if (r.revived) scene.revivePop();
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
  const dodged = await enemyAttack(scene, e, 'pounce');
  resetRig(rig);
  rig.c.setDepth(5);
  if (dodged && e.hp > 0 && scene.st.player.hp > 0) await counterAttack(scene, e);
}

// Perfect dodge reward: a free quick bite (0.5×, no energy, no QTE).
async function counterAttack(scene, e) {
  const st = scene.st, p = st.player, rig = p.rig, set = animSet(p.species, 'bite');
  scene.say('COUNTER!');
  rig.stopIdle();
  rig.c.setDepth(7);
  if (set.approach) await set.approach(scene, rig, e.rig);
  await set.strike(scene, rig, e.rig, {
    isPlayer: true, hit: 0,
    open: () => {}, result: () => Promise.resolve('good'),
    impact: () => {
      const r = B.counterStrike(st, e);
      const t = e.rig.top();
      scene.fx.pop(t.x, t.y - 8, 'COUNTER!', '#ffd040', 1, 800);
      hitFeedback(scene, p, e, r.dmg, 'good', 'hit', 0, { gold: true });
      traitFeedback(scene, p, e, r.trait);
      scene.afterDamage(e, r);
    }
  });
  if (set.retreat) await set.retreat(scene, rig);
  resetRig(rig);
  rig.c.setDepth(5);
  await scene.settle();
}
