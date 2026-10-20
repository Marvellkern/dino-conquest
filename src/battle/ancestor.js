import { W, lp } from '../config.js';
import { ANCESTOR } from '../data/surge.js';
import { ZONES } from '../data/zones.js';
import { VARIANTS } from '../data/variants.js';
import { APEX_STRIKES } from '../data/surge.js';
import { meta, persist } from '../systems/meta.js';
import { pickAncestor, callsLeft, ancestorHit } from '../systems/ancestors.js';
import { onPress } from '../systems/qte.js';
import { sfx } from '../systems/sfx.js';
import { music } from '../systems/music.js';
import { dinoName, skinOf } from '../run/run.js';
import { createRig } from '../sprites/rig.js';
import { text } from '../ui/font.js';
import { wait, tween, puff, impact } from './apexKit.js';
import { glowTexture } from '../render/atmos.js';
import { APEX_ANIMS } from './apexMoves.js';

// Ancestor Call (primal surge brief §5; rules in systems/ancestors.js). After an Apex
// Strike's 5th beat, once per run, the family tree's strongest dino can be called:
//   the screen goes nearly black but for the fighters, a soft choir chord swells
//   the ancestor rises behind the player as a spirit: its last form (and color variant),
//   pale and glowing, a little bigger, with dust motes and a cold light behind
//   its card: name, level and fate, from the family tree
//   after the player's finale, it strikes with its own species' Apex finale, nods to its
//   descendant and dissolves upward into light. The family tree remembers it answered.

// "CALL YOUR ANCESTOR? [TAP]" for a moment (the clock is still slowed). Resolves with the
// ancestor's family-tree entry, or null.
export function ancestorPrompt(s) {
  const run = s.st.build.run, f = pickAncestor(meta.fossils);
  if (!f || callsLeft(run, s.ancestorUsed ?? 0) <= 0) return Promise.resolve(null);
  return new Promise((resolve) => {
    const t = text(s, W / 2, lp(62, 78), lp('CALL YOUR ANCESTOR?  [TAP]', 'CALL YOUR ANCESTOR? TAP'), { origin: 0.5, color: '#9ae8ff' }).setDepth(41);
    s.tweens.add({ targets: t, alpha: 0.4, duration: 150, yoyo: true, repeat: -1 });
    sfx('tell');
    let done = false;
    const finish = (yes) => {
      if (done) return;
      done = true;
      off();
      clearTimeout(timer);
      t.destroy();
      resolve(yes ? f : null);
    };
    const off = onPress(s, () => finish(true));
    const timer = setTimeout(() => finish(false), ANCESTOR.promptMs);
    s.events.once('shutdown', () => finish(false));
  });
}

// The spirit rises behind the player.
export async function ancestorAppear(s, ctx, cine, f) {
  const run = s.st.build.run;
  if (run) run.ancestorCalls = (run.ancestorCalls ?? 0) + 1; else s.ancestorUsed = 1;
  const { rig, dir } = ctx;
  s.tweens.add({ targets: cine.dim, alpha: 0.85, duration: 200 });
  s.say('');
  music.stinger('ancestor');
  const x = Math.round(rig.homeX - dir * Math.max(18, rig.halfW * 0.7));
  const a = createRig(s, f.species, x, rig.homeY + 30, dir, skinOf(f.species, f.evo ?? 0, null, f.variant), Math.round(rig.baseScale ?? rig.scale));
  a.homeX = x;
  a.homeY = rig.homeY;
  a.scale *= 1.1; // a little bigger than in life
  a.c.setScale(a.scale * dir, a.scale).setDepth(7.9).setAlpha(0);
  for (const p of a.parts) { p.setTint(ANCESTOR.tint); p.preFX?.addGlow(0x7fe0ff, 2, 0, false, 0.1, 6); } // pale, see-through, a soft glowing edge
  ctx.ancestor = a;
  ctx.ancLight = s.lighting?.steady(110, 0x9ae8ff, 0) ?? null;
  ctx.ancLight?.setPosition(x - dir * 10, rig.homeY - 30);
  if (ctx.ancLight) s.tweens.add({ targets: ctx.ancLight, intensity: 1.2, duration: 400 });
  else ctx.ancGlow = s.add.image(x - dir * 10, rig.homeY - 30, glowTexture(s)).setTint(0x9ae8ff).setBlendMode(Phaser.BlendModes.ADD).setDepth(7.85).setDisplaySize(140, 120).setAlpha(0.4); // Low: a glow instead
  sfx('shimmer');
  await tween(s, { targets: a.c, y: a.homeY, alpha: ANCESTOR.alpha, duration: 220, ease: 'Quad.Out' });
  for (let i = 0; i < 3; i++) puff(s, x + (i - 1) * 10, a.homeY - 4, 0xcff4ff, 5, 10, 700);
  // Its card, in the family tree's words.
  const zone = ZONES[f.zone]?.name ?? '???';
  const fate = f.won ? 'CLEARED THE RUN' : `FELL IN THE ${zone}`;
  const name = dinoName({ species: f.species, evo: f.evo ?? 0 }).toUpperCase() + (VARIANTS[f.variant] ? ` ${VARIANTS[f.variant].name}` : '');
  const top = lp(22, 34);
  ctx.card = [
    text(s, W / 2, top, 'ANCESTOR', { origin: [0.5, 0], color: '#9ae8ff' }).setDepth(41),
    text(s, W / 2, top + 10, `${name} · LV${f.level} · GEN ${f.gen ?? '?'}`, { origin: [0.5, 0], small: true }).setDepth(41),
    text(s, W / 2, top + 17, fate, { origin: [0.5, 0], color: f.won ? '#7fe0ff' : '#e08070', small: true }).setDepth(41)
  ];
  for (const c of ctx.card) { c.setAlpha(0); s.tweens.add({ targets: c, alpha: 1, duration: 150 }); }
  await wait(s, 260);
}

// After the player's finale: the ancestor's own finale strike, a nod, and it's gone.
export async function ancestorStrike(s, ctx, f, targets) {
  const a = ctx.ancestor, st = s.st;
  const aoe = !!APEX_STRIKES[f.species]?.aoe, living = targets.filter((e) => e.hp > 0);
  const anim = APEX_ANIMS[f.species] ?? APEX_ANIMS.rex;
  if (living.length) {
    const actx = { s, rig: a, p: null, t: living[0].rig, all: living.map((e) => e.rig), color: 0x9ae8ff, dir: ctx.dir, evo: f.evo ?? 0, res: 'perfect' };
    const hits = ancestorHit(st, living, f, aoe);
    actx.impact = () => impact(s, actx, { hits, perfect: 0 });
    await anim.start?.(actx);
    await anim.finale(actx);
  }
  // The nod, then it dissolves upward into light.
  a.setFacing(ctx.dir);
  a.x = a.homeX;
  a.y = a.homeY;
  a.c.setAngle(0);
  sfx('growl');
  await tween(s, { targets: a.c, y: a.homeY - 3, duration: 90, yoyo: true });
  for (let i = 0; i < 4; i++) puff(s, a.x + Phaser.Math.Between(-12, 12), a.homeY - 10 - i * 8, 0xffffff, 6, 8, 600);
  for (const c of ctx.card) s.tweens.add({ targets: c, alpha: 0, duration: 250, onComplete: () => c.destroy() });
  if (ctx.ancLight) s.tweens.add({ targets: ctx.ancLight, intensity: 0, duration: 400, onComplete: () => s.lighting?.release(ctx.ancLight) });
  if (ctx.ancGlow) s.tweens.add({ targets: ctx.ancGlow, alpha: 0, duration: 400, onComplete: () => ctx.ancGlow.destroy() });
  await tween(s, { targets: a.c, alpha: 0, y: a.homeY - 16, duration: 450, ease: 'Quad.In' });
  a.shadowOff?.();
  a.c.destroy();
  // The family tree remembers.
  f.answered = (f.answered ?? 0) + 1;
  f.helped = dinoName(st.build.run?.dino ?? { species: st.player.species, evo: 0 }).toUpperCase();
  persist();
}

