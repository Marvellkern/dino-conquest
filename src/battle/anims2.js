import { SPRITE_SETS, wait, holdUntil, windup, hopIn, hopHome } from './anims.js';
import { sfx } from '../systems/sfx.js';

// Tidal Coast animations (v2.2), added to the shared sprite sets:
//   spit   Dilophosaurus: rears back, frill flares, a venom glob arcs to the target
//   claws  Therizinosaurus: steps in and rakes, one slash per hit, alternating high and low
// Same ctx contract as battle/anims.js.

const tween = (s, cfg) => new Promise((r) => s.tweens.add({ ...cfg, onComplete: r }));

async function spit(s, rig, target, ctx) {
  const rear = { crouch: true, dx: -2 }, flightMs = 200;
  if (ctx.isPlayer) {
    ctx.open();
    rig.setPose(rear);
    await holdUntil(s, ctx.result(), (i) => rig.setPose({ ...rear, dx: -2 - (i % 2) }));
  } else {
    await windup(s, rig, ctx, 90 + flightMs, rear);
    await wait(s, 90);
  }
  rig.setPose({ dx: 2 });
  sfx('whoosh');
  const m = rig.mouth(), p = target.hitPoint();
  const glob = s.add.rectangle(m.x, m.y, 3, 2, 0x63c74d).setDepth(9);
  const core = s.add.rectangle(m.x, m.y, 1, 1, 0xb55088).setDepth(10);
  const arc = { k: 0 };
  await tween(s, {
    targets: arc, k: 1, duration: flightMs,
    onUpdate: () => {
      const x = m.x + (p.x - m.x) * arc.k, y = m.y + (p.y - m.y) * arc.k - Math.sin(arc.k * Math.PI) * 10;
      glob.setPosition(Math.round(x), Math.round(y));
      core.setPosition(Math.round(x), Math.round(y));
      if (Math.random() < 0.5) { // dripping trail
        const d = s.add.rectangle(Math.round(x), Math.round(y), 1, 1, 0x63c74d).setDepth(9);
        s.tweens.add({ targets: d, y: d.y + 4, alpha: 0, duration: 250, onComplete: () => d.destroy() });
      }
    }
  });
  glob.destroy(); core.destroy();
  const res = await ctx.result();
  s.fx.sparks(p.x, p.y, { count: 6, dir: rig.homeFacing });
  ctx.impact(res);
  await wait(s, 120);
  rig.setPose({});
  await wait(s, 60);
}

async function claws(s, rig, target, ctx) {
  const dir = rig.homeFacing, wind = { dx: -2 };
  if (ctx.isPlayer) {
    ctx.open();
    rig.setPose(wind);
    await holdUntil(s, ctx.result(), (i) => rig.setPose({ dx: -2 - (i % 2) }));
  } else {
    await windup(s, rig, ctx, 100, wind);
  }
  rig.ghost(0.3);
  rig.setPose({ dx: 3 });
  sfx('whoosh');
  await wait(s, 50);
  const res = await ctx.result();
  const p = target.hitPoint(), high = (ctx.hit ?? 0) % 2 === 0;
  s.fx.slash(p.x - dir * 2, p.y + (high ? -6 : 4), dir);
  s.fx.slash(p.x + dir * 2, p.y + (high ? -3 : 7), dir);
  ctx.impact(res);
  await wait(s, 110);
  rig.setPose({});
  await wait(s, 40);
}

Object.assign(SPRITE_SETS, {
  spit: { strike: spit },
  claws: { approach: hopIn, strike: claws, retreat: hopHome }
});
