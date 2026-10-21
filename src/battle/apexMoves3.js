import { W } from '../config.js';
import { sfx } from '../systems/sfx.js';
import { wait, tween, standX, cloneRig, slash, shoot, puff, beatHit } from './apexKit.js';

// The Tidal Coast's Apex Strikes (v2.7; see battle/apexMoves.js for the shape of a set).
const off = (ctx) => (ctx.dir > 0 ? -40 : W + 40);
const far = (ctx) => Math.max(...ctx.all.map((t) => t.homeX * ctx.dir)) * ctx.dir;
const home = (s, rig, ms = 160) => tween(s, { targets: rig.c, x: rig.homeX, y: rig.homeY, duration: ms, ease: 'Quad.Out' });
const splash = (s, x, y, n = 10) => puff(s, x, y, 0x9ae8ff, n, 16, 500);
const WATER = 0x0099db;

export const COAST_APEX = {
  // Ichthyosaur, Shoal Storm: a school of ghost ichthyosaurs leaps through every enemy on each
  // beat, more each time; the real one dives through last.
  ichthy: {
    beat(ctx, i) {
      const { s, rig, dir } = ctx, end = far(ctx) + dir * 60;
      sfx('whoosh');
      for (let k = 0; k < 2 + i; k++) {
        const g = cloneRig(s, rig, { tint: k % 2 ? 0x9fd8ff : null, alpha: 0.85 });
        g.x = off(ctx) - dir * k * 10;
        g.y = rig.homeY - 4;
        s.tweens.add({ targets: g, x: end, duration: 220 + k * 12, ease: 'Linear', onComplete: () => g.destroy() });
        s.tweens.add({ targets: g, y: rig.homeY - 18 - (k % 3) * 4, duration: 110 + k * 6, yoyo: true, ease: 'Sine.Out' });
      }
      s.time.delayedCall(120, () => { for (const t of ctx.all) { beatHit(s, ctx, t, i); splash(s, t.homeX, t.homeY - 2, 4); } });
    },
    async finale(ctx) {
      const { s, rig, dir } = ctx;
      sfx('whoosh');
      await tween(s, { targets: rig.c, x: far(ctx) + dir * 40, y: rig.homeY - 20, duration: 150, ease: 'Quad.In', onUpdate: () => rig.ghost(0.35, 140) });
      for (const t of ctx.all) splash(s, t.homeX, t.homeY - 4, 12);
      await ctx.impact();
      await wait(s, 120);
      rig.x = off(ctx);
      await home(s, rig, 220);
    }
  },

  // Plesiosaur, Long-Neck Lash: the long neck whips at the target on every beat, high and low,
  // spraying water; the last lash is the widest.
  plesio: {
    async start({ s, rig, t }) { await tween(s, { targets: rig.c, x: standX(rig, t, -6), duration: 120 }); },
    beat(ctx, i) {
      const { s, rig, t, dir } = ctx, m = rig.mouth(), p = t.hitPoint(), up = i % 2 ? -1 : 1;
      rig.setPose({ dy: up });
      s.time.delayedCall(70, () => rig.setPose({}));
      slash(s, m.x, m.y, p.x + dir * 6, p.y + up * 8, 0xc0cbdc, 2, 200);
      beatHit(s, ctx, t, i);
      splash(s, p.x, p.y, 3 + i);
      sfx('whoosh');
    },
    async finale(ctx) {
      const { s, rig, t, dir } = ctx, m = rig.mouth(), p = t.hitPoint();
      slash(s, m.x - dir * 10, m.y - 16, p.x + dir * 16, p.y + 10, 0xffffff, 4, 360);
      slash(s, m.x - dir * 10, m.y + 6, p.x + dir * 16, p.y - 14, 0xc0cbdc, 3, 360);
      splash(s, p.x, p.y, 16);
      await ctx.impact();
      await wait(s, 140);
      await home(s, rig);
    }
  },

  // Baryonyx, Riverclaw Frenzy: the thumb claw rakes on every beat, then it hooks the
  // target, lifts it out of the water and slams it down.
  bary: {
    async start({ s, rig, t }) { await tween(s, { targets: rig.c, x: standX(rig, t, 10), duration: 120, ease: 'Quad.In' }); },
    beat(ctx, i) {
      const { s, t, dir } = ctx, p = t.hitPoint(), up = i % 2 ? 1 : -1;
      slash(s, p.x - dir * 14, p.y + up * 12, p.x + dir * 14, p.y - up * 12, 0xe8dcb8, 2, 200);
      beatHit(s, ctx, t, i);
      if (ctx.evo >= 2) puff(s, p.x, p.y, ctx.color, 6, 14);
      sfx('whoosh');
    },
    async finale(ctx) {
      const { s, rig, t } = ctx;
      await tween(s, { targets: t.c, y: t.homeY - 22, duration: 100, ease: 'Quad.Out' });
      await tween(s, { targets: t.c, y: t.homeY, duration: 50, ease: 'Quad.In' });
      splash(s, t.homeX, t.homeY, 14);
      s.fx.dust(t.homeX, t.homeY, 8);
      await ctx.impact();
      await wait(s, 160);
      await home(s, rig);
    }
  },

  // Mosasaur, Leviathan Breach: it sinks out of sight, water spouts erupt under the target
  // on every beat, then it breaches from below, jaws first, and crashes down.
  mosa: {
    async start({ s, rig }) {
      splash(s, rig.x, rig.homeY, 10);
      await tween(s, { targets: rig.c, y: rig.homeY + 50, alpha: 0, duration: 160, ease: 'Quad.In' });
    },
    beat(ctx, i) {
      const { s, t } = ctx;
      for (let k = 0; k < 2 + i; k++) shoot(s, t.homeX + (k - 1) * 8, t.homeY + 4, t.homeX + (k - 1) * 10, t.homeY - 30 - i * 6, WATER, 120, 2);
      splash(s, t.homeX, t.homeY - 6, 6 + i * 2);
      beatHit(s, ctx, t, i);
    },
    async finale(ctx) {
      const { s, rig, t, dir } = ctx;
      rig.x = Math.round(t.homeX - dir * rig.halfW * 0.6);
      rig.y = t.homeY + 50;
      rig.c.setAlpha(1);
      sfx('boom');
      await tween(s, { targets: rig.c, y: t.homeY - 36, duration: 120, ease: 'Quad.Out' });
      splash(s, t.homeX, t.homeY - 10, 22);
      await tween(s, { targets: rig.c, y: t.homeY, duration: 90, ease: 'Quad.In' });
      await ctx.impact();
      await wait(s, 140);
      await tween(s, { targets: rig.c, y: rig.homeY + 50, alpha: 0, duration: 140, ease: 'Quad.In' });
      rig.x = rig.homeX;
      await tween(s, { targets: rig.c, y: rig.homeY, alpha: 1, duration: 200, ease: 'Quad.Out' });
      splash(s, rig.x, rig.homeY, 8);
    }
  }
};
