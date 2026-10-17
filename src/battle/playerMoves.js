import { MOVES } from '../data/moves.js';
import { applyStatus } from '../systems/combat.js';
import * as B from '../systems/battleState.js';
import { attackBar } from '../systems/qte.js';
import { sfx } from '../systems/sfx.js';
import { animSet, roar } from './anims.js';
import { braceAnim } from './gimmicks.js';
import { hitFeedback, traitFeedback, dodgeHop } from './feedback.js';

// One player move, animated. Energy is spent here. Returns enemies that
// evaded a missed attack (Raptors), so the scene can let them pounce back.
export async function playerMove(scene, id) {
  const st = scene.st, m = MOVES[id], p = st.player, rig = p.rig;
  B.beginMove(st, id);
  rig.stopIdle();
  rig.c.setDepth(7);
  const evaders = [];

  if (m.status) {
    scene.say('ROAR!');
    await roar(scene, rig, () => {
      for (const { e, stunned } of B.playerRoar(st)) {
        const t = e.rig.top();
        scene.fx.pop(t.x, t.y, 'ATK DOWN', '#e06060', 1, 900);
        if (stunned) scene.fx.pop(t.x, t.y - 10, 'STUNNED!', '#fff096', 1, 900);
      }
    });
  } else if (m.brace) {
    scene.say('BRACE: MISSED DODGES BECOME BLOCKS');
    B.playerBrace(st);
    await braceAnim(scene, rig);
  } else {
    const target = scene.currentTarget();
    const set = animSet(p.species, m.anim);
    scene.say(`${m.name.toUpperCase()}!`);
    if (set.approach) await set.approach(scene, rig, target.rig);
    const muddy = B.consumeMuddy(st);
    const strikes = m.spread ? 1 : (m.hits ?? 1);
    for (let i = 0; i < strikes && target.hp > 0; i++) {
      const victims = m.spread ? spread(st, target, m.spread) : [target];
      await set.strike(scene, rig, target.rig, strikeCtx(scene, id, victims, muddy && i === 0, evaders));
    }
    if (m.self) applyStatus(p, m.self, true);
    if (set.retreat) await set.retreat(scene, rig);
  }

  rig.setPose({});
  rig.setFacing(rig.homeFacing);
  rig.x = rig.homeX;
  rig.c.setDepth(5);
  rig.startIdle();
  B.endMove(st);
  await scene.settle();
  return evaders;
}

// Swarm: the target first, then the others, wrapping around.
function spread(st, first, n) {
  const list = [first, ...B.targetable(st).filter((e) => e !== first)];
  return Array.from({ length: n }, (_, i) => list[i % list.length]);
}

// QTE + damage wiring for one strike of a player move.
function strikeCtx(scene, id, victims, muddy, evaders) {
  const st = scene.st;
  let bar = null, n = 0, noted = false;
  return {
    isPlayer: true,
    hit: 0,
    open: () => { if (!bar) bar = attackBar(scene, { rng: st.rng, sure: !!MOVES[id].sure, muddy }); },
    result: () => bar,
    targetRig: (i) => victims[i % victims.length].rig,
    impact: (res) => {
      if (!noted) {
        noted = true;
        if (B.noteQte(st, res)) scene.streakUp();
      }
      const k = n++;
      let v = victims[k % victims.length];
      if (v.hp <= 0 || v.status.submerged) v = B.targetable(st)[0];
      if (!v) return;
      const r = B.playerStrike(st, id, v, res);
      if (r.evaded) {
        const t = v.rig.top();
        scene.fx.pop(t.x, t.y, 'EVADE!', '#ff6040', 1, 800);
        sfx('dodge');
        dodgeHop(scene, v.rig, 1);
        if (!evaders.includes(v)) evaders.push(v);
        return;
      }
      hitFeedback(scene, st.player, v, r.dmg, res, 'hit', k, { gold: st.activeEmpower });
      traitFeedback(scene, st.player, v, r.trait);
      scene.afterDamage(v, r);
    }
  };
}
