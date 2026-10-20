import { W, H, lp } from '../config.js';
import { APEX } from '../data/surge.js';
import { QTE } from '../data/moves.js';
import { VARIANTS } from '../data/variants.js';
import * as SG from '../systems/surge.js';
import * as B from '../systems/battleState.js';
import { moveCost } from '../systems/build.js';
import { music } from '../systems/music.js';
import { rhythmQte } from './rhythm.js';
import { tween, impact } from './apexKit.js';
import { ancestorPrompt, ancestorAppear, ancestorStrike } from './ancestor.js';
import { APEX_ANIMS } from './apexMoves.js';

// The Apex Strike (primal surge brief §4; numbers in data/surge.js): the species' cinematic
// finisher, once per Primal Surge for 2 energy.
//   letterbox bars, the clock at half speed, the camera ~1.25x toward the action, the
//   arena dims, the attacker lit by its aura
//   a 5-beat rhythm QTE on the music's beat (battle/rhythm.js); every landed beat is a hit in
//   the species' animation (battle/apexMoves*.js)
//   the finale: a 200ms hitstop, a white flash, a shockwave, the biggest shake in the game and
//   a huge damage number that holds; a kill dissolves in slow motion
// An animation set is { start?(ctx), beat(ctx, i), finale(ctx) }: finale awaits ctx.impact()
// at the moment the last hit lands, then brings the dino home.
export async function apexStrike(scene) {
  const s = scene, st = s.st, p = st.player, rig = p.rig, info = SG.apexInfo(p.species);
  st.energy -= moveCost(st, 'apex');
  const targets = info.aoe ? B.targetable(st) : [s.currentTarget()];
  if (!targets[0]) return;
  const anim = APEX_ANIMS[p.species] ?? APEX_ANIMS.rex;
  const color = VARIANTS[st.build.variant]?.glow ?? info.aura;
  const ctx = {
    s, rig, p, t: targets[0].rig, all: targets.map((e) => e.rig), color, dir: rig.homeFacing, evo: st.build.run?.dino.evo ?? 0, res: null
  };
  s.say(`${info.name}!`);
  rig.stopIdle();
  const cine = enter(s, rig, ctx.all);
  await anim.start?.(ctx);
  // The beats. The windows scale with the zone like the other QTEs.
  const k = Math.min(1.2, Math.max(0.7, st.timing.dodgeMs / QTE.dodgeMs));
  const beats = await rhythmQte(s, {
    beats: APEX.beats, lead: APEX.lead, window: { perfect: APEX.window.perfect * k, good: APEX.window.good * k },
    onBeat: (i, r) => { ctx.res = r; if (r !== 'miss') anim.beat(ctx, i); }
  });
  const out = SG.apexHit(st, targets, beats);
  // Ancestor Call (battle/ancestor.js): offered while something's still standing.
  const anc = targets.some((e) => e.hp > 0) ? await ancestorPrompt(s) : null;
  if (anc) await ancestorAppear(s, ctx, cine, anc);
  s.fx.setSpeed(1); // the beats were slowed; the finale lands at full speed (under ~4s in all)
  s.say('');
  ctx.impact = () => impact(s, ctx, out);
  await anim.finale(ctx);
  if (anc) await ancestorStrike(s, ctx, anc, targets);
  await exit(s, cine);
  rig.setPose({});
  rig.c.setAngle(0);
  rig.setFacing(rig.homeFacing);
  rig.x = rig.homeX;
  rig.y = rig.homeY;
  rig.c.setDepth(5);
  rig.startIdle();
  for (const e of targets) if (e.hp > 0) { e.rig.x = e.rig.homeX; e.rig.y = e.rig.homeY; e.rig.c.setAngle(0).setDepth(5); }
  await s.settle();
}

function enter(s, rig, targets) {
  const bar = lp(18, 30);
  const top = s.add.rectangle(0, -bar, W, bar, 0x05070c).setOrigin(0).setDepth(41);
  const bot = s.add.rectangle(0, H, W, bar, 0x05070c).setOrigin(0).setDepth(41);
  s.tweens.add({ targets: top, y: 0, duration: 120 });
  s.tweens.add({ targets: bot, y: H - bar, duration: 120 });
  const dim = s.add.rectangle(0, 0, W, H, 0x05070c).setOrigin(0).setDepth(7.5).setAlpha(0);
  s.tweens.add({ targets: dim, alpha: 0.45, duration: 100 });
  rig.c.setDepth(8);
  for (const t of targets) t.c.setDepth(7.8);
  s.fx.setSpeed(APEX.slow);
  // The zoom only where the UI has its own camera (Medium / High): on Low the HUD would zoom too.
  if (s.cameras.cameras.length > 1) {
    const c = targets[0].center(), m = rig.center();
    s.fx.zoomTo(APEX.zoom, (c.x + m.x) / 2, (c.y + m.y) / 2, 300);
  }
  music.duck(250);
  return { top, bot, dim, bar };
}

async function exit(s, { top, bot, dim, bar }) {
  s.fx.setSpeed(1);
  s.fx.zoomOut(300);
  s.tweens.add({ targets: top, y: -bar, duration: 200, onComplete: () => top.destroy() });
  s.tweens.add({ targets: bot, y: H, duration: 200, onComplete: () => bot.destroy() });
  await tween(s, { targets: dim, alpha: 0, duration: 200 });
  dim.destroy();
}
