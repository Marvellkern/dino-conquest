import { QTE } from '../data/moves.js';
import { FEINT_MS } from '../data/qteProfiles.js';
import { sfx } from '../systems/sfx.js';
import { music } from '../systems/music.js';

// Attack animations. Each move kind is a set of { approach?, strike, retreat? }.
// strike(scene, rig, target, ctx) talks to the battle through ctx:
//   ctx.open(msToImpact)  start the QTE (player: attack bar; enemy: defend ring
//                         timed to land at msToImpact)
//   ctx.result()          promise of the QTE result
//   ctx.impact(result)    apply damage + hit feedback
//   ctx.tellMult          enemy wind-up speed (boss phase 2 is faster)
//   ctx.timing            enemy wind-up profile (data/qteProfiles.js rollTiming)
//   ctx.targetRig(i)      Swarm: rig hit by the i-th attacker (spread)
// scene.fx is the Fx instance.

export const wait = (s, ms) => new Promise((r) => s.time.delayedCall(ms, r));
const tween = (s, cfg) => new Promise((r) => s.tweens.add({ ...cfg, onComplete: r }));

// Hold a pose until the QTE resolves, calling tremble(i) every 60ms.
async function holdUntil(s, promise, tremble) {
  let done = false;
  promise.then(() => { done = true; });
  for (let i = 0; !done; i++) {
    tremble(i);
    await Promise.race([wait(s, 60), promise]);
  }
}

async function hopTo(s, rig, x, ms, height = 3) {
  await Promise.all([
    tween(s, { targets: rig.c, x: Math.round(x), duration: ms, ease: 'Sine.InOut' }),
    tween(s, { targets: rig.c, y: rig.homeY - height, duration: ms / 2, yoyo: true, ease: 'Quad.Out' })
  ]);
  rig.y = rig.homeY;
  s.fx.dust(rig.x, rig.homeY, 4);
}

// Enemy telegraph: "!" over the head + a shudder that follows the timing
// profile, so the ring is readable: lunge shudders faster and faster, snap
// jolts hard then settles, delay freezes mid-windup ("...") while the ring waits.
async function tell(s, rig, ms, pose = {}, t = {}) {
  const p = rig.top();
  s.fx.pop(p.x, p.y, '!', '#fff096', 2, ms);
  sfx('tell');
  rig.setPose(pose);
  const x0 = rig.x;
  let el = 0, i = 0, paused = false;
  while (el < ms) {
    if (t.pause && !paused && el >= t.pauseAt) { // the hesitation
      paused = true;
      rig.x = x0;
      const q = rig.top();
      s.fx.pop(q.x, q.y - 10, '...', '#c0cbdc', 1, t.pause);
      await wait(s, t.pause);
      el += t.pause;
      continue;
    }
    const k = el / ms;
    const step = t.ease === 'in' ? Math.round(110 - 80 * k) : t.ease === 'out' ? Math.round(30 + 70 * k) : 60;
    rig.x = x0 + (i++ % 2) * (t.ease === 'out' && k < 0.3 ? 2 : 1);
    const until = t.pause && !paused ? t.pauseAt : ms;
    const dt = Math.max(1, Math.min(step, until - el, ms - el));
    await wait(s, dt);
    el += dt;
  }
  rig.x = x0;
}


// A generic fake-out: lurch at the target, stop short, pull back.
async function fakeLurch(s, rig) {
  const x0 = rig.x, dir = rig.homeFacing;
  sfx('whoosh');
  rig.ghost(0.3);
  rig.x = x0 + dir * 6; await wait(s, 100);
  const q = rig.top();
  s.fx.pop(q.x, q.y, '?', '#ff6040', 2, 300);
  await wait(s, 120);
  rig.x = x0 + dir * 2; await wait(s, 80);
  rig.x = x0; await wait(s, FEINT_MS - 300);
}

// Enemy wind-up: opens the defend ring for the whole lead (wind-up, a feint's
// fake-out, and the move's own tailMs until impact), then plays the tell.
async function windup(s, rig, ctx, tailMs, pose = {}, fake = fakeLurch) {
  const t = ctx.timing ?? { tell: QTE.tellMs, ease: 'linear', pause: 0, pauseAt: 0, feint: false };
  const k = ctx.tellMult ?? 1, tellMs = Math.round(t.tell * k), pauseAt = Math.round(t.pauseAt * k);
  const fakeMs = t.feint ? FEINT_MS : 0;
  ctx.open(tellMs + fakeMs + tailMs, { ease: t.ease, pause: t.pause, pauseAt, resetAt: t.feint ? tellMs + fakeMs : null });
  await tell(s, rig, tellMs, pose, { ...t, pauseAt });
  if (t.feint) await fake(s, rig);
}

// Where an attacker stands so it overlaps the target by `overlap` px.
const standX = (rig, target, overlap) => target.homeX - rig.homeFacing * (rig.halfW + target.halfW - overlap);

/* ---------- T-rex (part rig) ---------- */

const W1 = { body: -1, hx: -1, hy: -1, gap: 0 };
const W2 = { body: -2, hx: -1, hy: -2, gap: 1 };
const ROAR = { body: -2, hx: -1, hy: -2, gap: 3 };

async function rexApproach(s, rig, target) {
  const x0 = rig.x, tx = standX(rig, target, 12);
  for (const k of [0.5, 1]) {
    await hopTo(s, rig, x0 + (tx - x0) * k, 110, 3);
    s.fx.shake(1, 60);
    sfx('step');
  }
}

async function rexRetreat(s, rig) {
  const x0 = rig.x;
  for (const k of [0.5, 1]) {
    await hopTo(s, rig, x0 + (rig.homeX - x0) * k, 100, 3);
    sfx('step');
  }
}

// Bite timing from the brief (§4.3). `big` = Crushing Bite (wider jaw, heavier).
async function rexBite(s, rig, target, ctx, big = false) {
  const roarGap = big ? 5 : 3, lungeGap = big ? 6 : 4;
  if (ctx.isPlayer) ctx.open();
  else await windup(s, rig, ctx, 90 + 90 + 130 + 50, W1);
  rig.setPose(W1); await wait(s, 90);
  rig.setPose(W2); await wait(s, 90);
  rig.setPose({ ...ROAR, gap: roarGap });
  if (big) s.fx.shake(1, 120);
  if (ctx.isPlayer) await holdUntil(s, ctx.result(), (i) => rig.setPose({ ...ROAR, gap: roarGap + (i % 2) }));
  else await wait(s, 130);
  rig.setPose({ body: 1, hx: 2, hy: 0, gap: lungeGap }); await wait(s, 50);
  const res = await ctx.result();
  rig.setPose({ body: 3, hx: 3, hy: 1, gap: 0 }); // SNAP
  ctx.impact(res);
  await wait(s, 70);
  await wait(s, 90); // sparks big
  for (const b of [2, 1, 0]) { rig.setPose({ body: b, hx: b, hy: 0, gap: 0 }); await wait(s, 90); }
}

/* ---------- Whole-sprite dinos (raptor etc.) ---------- */

// Pounce: crouch → 2-frame arc leap → claw slash. Dodge window = the leap.
async function pounce(s, rig, target, ctx) {
  const land = standX(rig, target, 10);
  if (Math.abs(rig.x - land) < 6) await hopTo(s, rig, land - rig.homeFacing * 16, 90, 4); // follow-up slash
  if (ctx.isPlayer) {
    ctx.open();
    rig.setPose({ crouch: true });
    await holdUntil(s, ctx.result(), (i) => rig.setPose({ crouch: true, dx: -(i % 2) }));
  } else {
    await windup(s, rig, ctx, 120 + 140, {}, async () => { // fake leap: rises like it's going, then drops back
      rig.setPose({ crouch: true }); await wait(s, 100);
      rig.setPose({}); rig.y = rig.homeY - 6; sfx('whoosh'); await wait(s, 120);
      rig.y = rig.homeY; s.fx.pop(rig.top().x, rig.top().y, '?', '#ff6040', 2, 300); await wait(s, 160);
    });
    rig.setPose({ crouch: true }); await wait(s, 120);
  }
  const x0 = rig.x;
  rig.setPose({});
  sfx('whoosh');
  rig.ghost(); rig.x = Math.round((x0 + land) / 2); rig.y = rig.homeY - 14; await wait(s, 70);
  rig.ghost(); rig.x = land; rig.y = rig.homeY - 4; await wait(s, 70);
  const res = await ctx.result();
  rig.y = rig.homeY;
  const p = target.hitPoint();
  s.fx.slash(p.x, p.y, rig.homeFacing);
  ctx.impact(res);
  await wait(s, 60);
  await wait(s, 90);
}

async function hopHome(s, rig) {
  const x0 = rig.x;
  for (const k of [0.5, 1]) {
    rig.ghost(0.25);
    await hopTo(s, rig, x0 + (rig.homeX - x0) * k, 80, 5);
  }
}

const hopIn = (s, rig, target) => hopTo(s, rig, standX(rig, target, 12), 160, 6);

// Two-frame arc leap for a rig or a plain image (both have x / y).
async function leap(s, obj, land, homeY) {
  const x0 = obj.x;
  obj.x = Math.round((x0 + land) / 2); obj.y = homeY - 14; await wait(s, 70);
  obj.x = land; obj.y = homeY - 4; await wait(s, 70);
  obj.y = homeY;
}

// Compy Swarm: two ghost compies join in; one QTE, three quick hits.
async function swarm(s, rig, target, ctx) {
  const dir = rig.homeFacing;
  const ghosts = [18, 34, 50].slice(0, Math.max(1, (ctx.spread ?? 3) - 1)).map((off) => {
    const g = s.add.image(rig.x - dir * off, rig.homeY, rig.key).setOrigin(0.5, 1)
      .setScale(rig.scale * dir, rig.scale).setTint(0x9fd8ff).setAlpha(0).setDepth(4);
    s.tweens.add({ targets: g, alpha: 0.65, duration: 150 });
    return g;
  });
  const crouch = (on) => {
    rig.setPose({ crouch: on });
    for (const g of ghosts) g.setTexture(on ? `${rig.key}_crouch` : rig.key);
  };
  if (ctx.isPlayer) {
    ctx.open();
    crouch(true);
    await holdUntil(s, ctx.result(), (i) => rig.setPose({ crouch: true, dx: -(i % 2) }));
  } else {
    await windup(s, rig, ctx, 120 + 140);
    crouch(true);
    await wait(s, 120);
  }
  crouch(false);
  const attackers = [...ghosts, rig];
  for (let i = 0; i < attackers.length; i++) {
    const a = attackers[i], tg = ctx.targetRig?.(i) ?? target;
    if (a === rig) rig.ghost();
    sfx('whoosh');
    await leap(s, a, standX(rig, tg, 10) + dir * (6 - (i % 3) * 6), rig.homeY);
    const res = await ctx.result();
    const p = tg.hitPoint();
    s.fx.slash(p.x, p.y + (i - 1) * 4, dir);
    ctx.impact(res);
    await wait(s, 90);
  }
  for (const g of ghosts) s.tweens.add({ targets: g, alpha: 0, duration: 160, onComplete: () => g.destroy() });
  await wait(s, 60);
}

// Heavy lunge from where it stands (Trike's basic attack).
async function ram(s, rig, target, ctx) {
  const wind = { crouch: true, dx: -2 };
  if (ctx.isPlayer) {
    ctx.open();
    rig.setPose(wind);
    await holdUntil(s, ctx.result(), (i) => rig.setPose({ ...wind, dx: -2 - (i % 2) }));
  } else {
    await windup(s, rig, ctx, 120 + 60);
    rig.setPose(wind);
    await wait(s, 120);
  }
  rig.ghost();
  rig.setPose({ dx: 4 });
  sfx('whoosh');
  await wait(s, 60);
  const res = await ctx.result();
  ctx.impact(res);
  await wait(s, 140);
  rig.setPose({ dx: 2 }); await wait(s, 80);
  rig.setPose({}); await wait(s, 60);
}

// Horn Charge: head down, then a full-speed dash across the arena.
async function charge(s, rig, target, ctx) {
  const tx = standX(rig, target, 14), dashMs = 220;
  const wind = { crouch: true, dx: -2 };
  if (ctx.isPlayer) {
    ctx.open();
    rig.setPose(wind);
    await holdUntil(s, ctx.result(), (i) => { rig.setPose(wind); rig.x = rig.homeX - (i % 2); });
  } else await windup(s, rig, ctx, dashMs, wind);
  rig.setPose({ crouch: true });
  sfx('step');
  s.time.addEvent({ delay: 40, repeat: 4, callback: () => rig.ghost(0.3) });
  await tween(s, { targets: rig.c, x: tx, duration: dashMs, ease: 'Quad.In' });
  rig.setPose({ dx: 2 });
  const res = await ctx.result();
  ctx.impact(res);
  s.fx.shake(3, 200);
  await wait(s, 160);
  rig.setPose({});
}

/* ---------- Shared ---------- */

// Tail Whip: turn around, wind up, swing the tail through the target.
async function tailWhip(s, rig, target, ctx) {
  const dir = rig.homeFacing;
  rig.setFacing(-dir);
  sfx('whoosh');
  const x0 = rig.x;
  rig.x = x0 - dir * 4;
  if (ctx.isPlayer) {
    ctx.open();
    await holdUntil(s, ctx.result(), (i) => { rig.x = x0 - dir * (4 + (i % 2)); });
  } else await windup(s, rig, ctx, 80);
  rig.ghost();
  rig.x = x0 + dir * 6;
  await wait(s, 80);
  const res = await ctx.result();
  const p = target.hitPoint();
  s.fx.arc(p.x, p.y, dir);
  ctx.impact(res);
  await wait(s, 120);
  rig.x = x0;
  rig.setFacing(dir);
  await wait(s, 80);
}

// Boss charge-up: rears back and rumbles, red rings pulsing from the mouth.
export async function chargeUp(s, rig) {
  rig.setPose(rig.roarPose);
  sfx('growl');
  for (let i = 0; i < 6; i++) {
    const m = rig.mouth();
    if (i % 2 === 0) s.fx.rings(m.x, m.y, 0xff5030);
    s.fx.shake(1, 120);
    rig.x = rig.homeX + (i % 2 ? 1 : -1);
    await wait(s, 130);
  }
  rig.x = rig.homeX;
  rig.setPose({});
  await wait(s, 120);
}

// Roar (status move): shockwave rings from the mouth.
export async function roar(s, rig, onRoar) {
  s.lighting?.roar(); // the scene dims for a beat (lit tiers)
  music.duck();
  rig.setPose(rig.roarPose);
  sfx('roar');
  for (let i = 0; i < 3; i++) {
    const m = rig.mouth();
    s.fx.rings(m.x, m.y);
    s.fx.shake(2, 140);
    if (i === 0) onRoar();
    await wait(s, 170);
  }
  rig.setPose({});
  await wait(s, 150);
}

const REX_SETS = {
  bite: { approach: rexApproach, strike: (s, r, t, c) => rexBite(s, r, t, c), retreat: rexRetreat },
  bigBite: { approach: rexApproach, strike: (s, r, t, c) => rexBite(s, r, t, c, true), retreat: rexRetreat },
  tail: { approach: rexApproach, strike: tailWhip, retreat: rexRetreat }
};

export const SPRITE_SETS = {
  bite: { strike: pounce, retreat: hopHome },
  tail: { approach: hopIn, strike: tailWhip, retreat: hopHome },
  swarm: { strike: swarm, retreat: hopHome },
  charge: { strike: charge, retreat: hopHome }
};

// Per-species overrides on top of the sprite sets.
const SETS = {
  rex: REX_SETS,
  trike: { ...SPRITE_SETS, bite: { approach: hopIn, strike: ram, retreat: hopHome } },
  pachy: { ...SPRITE_SETS, bite: { approach: hopIn, strike: ram, retreat: hopHome } }
};

// Shared helpers for battle/anims2.js (the Tidal Coast animations).
export { holdUntil, hopTo, windup, standX, hopIn, hopHome };

export function animSet(species, kind) {
  const sets = SETS[species] ?? SPRITE_SETS;
  return sets[kind] ?? sets.bite;
}
