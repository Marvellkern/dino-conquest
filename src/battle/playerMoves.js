import { MOVES } from '../data/moves.js';
import { MUTATION_TUNING } from '../data/mutations.js';
import { applyStatus } from '../systems/combat.js';
import * as B from '../systems/battleState.js';
import { hitsAll, spreadCount, moveHits } from '../systems/build.js';
import { attackBar } from '../systems/qte.js';
import { rollBar } from '../data/qteProfiles.js';
import { sfx } from '../systems/sfx.js';
import { animSet, roar } from './anims.js';
import './anims2.js'; // spit + claws sets
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
      for (const r of B.playerRoar(st)) {
        const t = r.e.rig.top();
        scene.fx.pop(t.x, t.y, 'ATK DOWN', '#e06060', 1, 900);
        if (r.stunned) scene.fx.pop(t.x, t.y - 10, 'STUNNED!', '#fff096', 1, 900);
        if (r.cancelled) scene.fx.pop(t.x, t.y - 10, 'COWERS!', '#b070e0', 1, 900);
        if (r.dmg) { scene.fx.number(t.x, t.y + 6, r.dmg); r.e.rig.flash(50); }
        scene.afterDamage(r.e, r);
      }
    });
  } else if (m.brace) {
    scene.say('BRACE: MISSED DODGES BECOME BLOCKS');
    const healed = B.playerBrace(st);
    await braceAnim(scene, rig);
    if (healed) healPop(scene, healed);
  } else {
    const target = scene.currentTarget();
    const set = animSet(p.species, m.anim);
    scene.say(`${m.name.toUpperCase()}!`);
    if (set.approach) await set.approach(scene, rig, target.rig);
    let muddy = B.consumeMuddy(st), blind = B.consumeBlind(st);
    let strikes = m.spread ? 1 : moveHits(st, m), chains = 0;
    for (let i = 0; i < strikes && target.hp > 0; i++) {
      const aoe = hitsAll(st, id);
      const victims = aoe ? B.targetable(st) : m.spread ? spread(st, target, spreadCount(st, m)) : [target];
      const ctx = strikeCtx(scene, id, victims, aoe, muddy, evaders, blind);
      muddy = false;
      blind = false;
      await set.strike(scene, rig, target.rig, ctx);
      if (ctx.chained && chains < MUTATION_TUNING.chainMax && target.hp > 0) { chains++; strikes++; scene.say('CHAIN BITE!'); }
    }
    if (m.self) applyStatus(p, m.self, true);
    const ghost = B.afterAttack(st, target);
    if (ghost) {
      const t = target.rig.hitPoint();
      scene.fx.number(t.x + 8, t.y - 4, ghost.dmg, { color: '#9fd8ff' });
      target.rig.flash(40);
      scene.afterDamage(target, ghost);
    }
    if (set.retreat) await set.retreat(scene, rig);
  }

  rig.setPose({});
  rig.setFacing(rig.homeFacing);
  rig.x = rig.homeX;
  rig.c.setDepth(5);
  rig.startIdle();
  if (B.endMove(st).streakUp) scene.streakUp(); // a full-crit move completes the streak
  await scene.settle();
  return evaders;
}

function healPop(scene, n) {
  const t = scene.st.player.rig.top();
  scene.fx.number(t.x, t.y, `+${n}`, { color: '#80d060' });
}

// Swarm: the target first, then the others, wrapping around.
function spread(st, first, n) {
  const list = [first, ...B.targetable(st).filter((e) => e !== first)];
  return Array.from({ length: n }, (_, i) => list[i % list.length]);
}

// QTE + damage wiring for one strike of a player move. aoe: one impact hits
// every victim. Otherwise impact i hits victims[i] (Swarm spreads its hits).
function strikeCtx(scene, id, victims, aoe, muddy, evaders, blind = false) {
  const st = scene.st;
  let bar = null, n = 0, qte = null;
  const ctx = {
    isPlayer: true,
    hit: 0,
    chained: false,
    spread: victims.length,
    open: () => { if (!bar) bar = attackBar(scene, { rng: st.rng, sure: !!MOVES[id].sure, muddy, blind, shape: rollBar(st.rng, st.timing.bar) }); },
    result: () => bar,
    targetRig: (i) => victims[i % victims.length].rig,
    impact: (res) => {
      if (qte === null) { // first impact of this QTE: Meteor Chip, crit streak
        const f = B.finalQte(st, res);
        qte = f.qte;
        if (f.auto) { const t = st.player.rig.top(); scene.fx.pop(t.x, t.y - 10, 'METEOR CHIP!', '#ffd040', 1, 900); }
        B.noteQte(st, qte);
      }
      const k = n++;
      for (let v of aoe ? victims : [victims[k % victims.length]]) {
        if (v.hp <= 0 || v.status.submerged) { if (aoe) continue; v = B.targetable(st)[0]; }
        if (!v) return;
        strikeOne(scene, id, v, qte, k, evaders, ctx);
      }
    }
  };
  return ctx;
}

function strikeOne(scene, id, v, qte, k, evaders, ctx) {
  const st = scene.st, r = B.playerStrike(st, id, v, qte);
  if (r.evaded) {
    const t = v.rig.top();
    scene.fx.pop(t.x, t.y, 'EVADE!', '#ff6040', 1, 800);
    sfx('dodge');
    dodgeHop(scene, v.rig, 1);
    if (!evaders.includes(v) && !v.brain.noPounce) evaders.push(v); // Ichthyosaurs just slip away
    return;
  }
  hitFeedback(scene, st.player, v, r.dmg, qte, 'hit', k, { gold: st.activeEmpower, move: id });
  traitFeedback(scene, st.player, v, r.trait);
  const t = v.rig.top();
  if (r.fx.healed) healPop(scene, r.fx.healed);
  if (r.fx.poisoned) scene.fx.pop(t.x, t.y - 4, 'POISON', '#80d060', 1, 700);
  if (r.fx.bled) scene.fx.pop(t.x, t.y - 22, 'BLEED', '#e43b44', 1, 700);
  if (r.fx.stunned) scene.fx.pop(t.x, t.y - 14, 'STUNNED!', '#fff096', 1, 900);
  if (r.fx.chain) ctx.chained = true;
  if (r.calmed) scene.fx.pop(t.x, t.y - 14, 'CALMED', '#9ab8ff', 1, 900);
  if (r.defGain) { const pt = st.player.rig.top(); scene.fx.pop(pt.x, pt.y - 12, `DEF+${r.defGain}`, '#7fb0ff', 1, 800); }
  if (r.recoil) { // Stego spikes prick the attacker
    const pt = st.player.rig.hitPoint();
    scene.fx.number(pt.x, pt.y - 10, r.recoil, { color: '#f77622' });
    scene.fx.pop(t.x, t.y - 24, 'SPIKES!', '#f77622', 1, 700);
    st.player.rig.flash(40);
  }
  if (r.kill?.healed) healPop(scene, r.kill.healed);
  if (r.kill?.energy) { const pt = st.player.rig.top(); scene.fx.pop(pt.x, pt.y - 12, '+1 ENERGY', '#fff096', 1, 800); }
  scene.afterDamage(v, r);
}
