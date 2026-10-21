import { W } from '../config.js';
import { sfx } from '../systems/sfx.js';
import { wait, tween, standX, cloneRig, slash, crack, beatHit } from './apexKit.js';
import { MORE_APEX } from './apexMoves2.js';
import { COAST_APEX } from './apexMoves3.js';

// Apex Strike animations, one set per species (battle/apex.js runs them):
//   start(ctx)     the wind-up before the beats (optional)
//   beat(ctx, i)   a landed beat i (0-4): one hit, quick (the clock runs at half speed)
//   finale(ctx)    the last hit: await ctx.impact() as it lands, then head home
// ctx: { s, rig, p, t (the target's rig), all (every target rig, aoe), color, dir, evo, res }.
// Evolved forms (evo 2) get extra particles.

const offscreen = (ctx) => (ctx.dir > 0 ? -40 : W + 40);

export const APEX_ANIMS = {
  // T-Rex, Tyrant Crush: lunges in, clamps the enemy in its jaws, shakes it every beat, then
  // lifts and slams it down.
  rex: {
    async start({ s, rig, t }) {
      rig.setPose({ body: -1, hx: -1, hy: -1, gap: 3 });
      await tween(s, { targets: rig.c, x: standX(rig, t, 14), duration: 140, ease: 'Quad.In' });
      sfx('step');
      s.fx.shake(2, 80);
      rig.setPose({ body: 1, hx: 2, hy: 0, gap: 0 }); // CLAMP
    },
    beat(ctx, i) {
      const { s, rig, t } = ctx;
      rig.setPose({ body: i % 2 ? 2 : 0, hx: 3, hy: i % 2 ? 1 : -1, gap: 0 });
      t.y = t.homeY - (i % 2 ? 5 : 1);
      beatHit(s, ctx, t, i);
      if (ctx.evo >= 2) s.fx.sparks(rig.mouth().x, rig.mouth().y, { count: 6, gold: true });
    },
    async finale(ctx) {
      const { s, rig, t, dir } = ctx;
      rig.setPose({ body: -2, hx: 1, hy: -3, gap: 0 });
      await tween(s, { targets: t.c, y: t.homeY - 22, duration: 90, ease: 'Quad.Out' });
      rig.setPose({ body: 3, hx: 3, hy: 2, gap: 0 });
      await tween(s, { targets: t.c, y: t.homeY, duration: 50, ease: 'Quad.In' });
      crack(s, t.homeX, t.homeY, dir, 50);
      crack(s, t.homeX, t.homeY, -dir, 30);
      await ctx.impact();
      await wait(s, 160);
      rig.setPose({});
      await tween(s, { targets: rig.c, x: rig.homeX, duration: 160, ease: 'Quad.Out' });
    }
  },

  // Raptor, Pack Frenzy: a ghost raptor leaps in from off-screen on every beat and slashes;
  // the last one is the real raptor.
  raptor: {
    beat(ctx, i) {
      const { s, rig, t, dir } = ctx;
      const g = cloneRig(s, rig, { tint: ctx.evo >= 2 ? 0xffd040 : 0x9fd8ff, alpha: 0.75 });
      g.x = offscreen(ctx);
      g.y = rig.homeY;
      const land = standX(rig, t, 10) + (i % 2 ? -dir * 6 : 0);
      sfx('whoosh');
      s.tweens.add({ targets: g, x: land, duration: 110, ease: 'Quad.Out' });
      s.tweens.add({
        targets: g, y: rig.homeY - 16, duration: 55, yoyo: true, ease: 'Quad.Out',
        onComplete: () => {
          const p = t.hitPoint();
          slash(s, p.x - dir * 8, p.y - 8 + i * 2, p.x + dir * 8, p.y + 8 - i * 2, ctx.color);
          beatHit(s, ctx, t, i);
          s.tweens.add({ targets: g, alpha: 0, x: g.x - dir * 10, duration: 140, onComplete: () => g.destroy() });
        }
      });
    },
    async finale(ctx) {
      const { s, rig, t, dir } = ctx;
      const land = standX(rig, t, 10), x0 = rig.x;
      rig.setPose({ crouch: true });
      await wait(s, 80);
      rig.setPose({});
      sfx('whoosh');
      rig.ghost(); rig.x = Math.round((x0 + land) / 2); rig.y = rig.homeY - 16; await wait(s, 50);
      rig.ghost(); rig.x = land; rig.y = rig.homeY - 4; await wait(s, 50);
      rig.y = rig.homeY;
      const p = t.hitPoint();
      slash(s, p.x - dir * 12, p.y - 12, p.x + dir * 12, p.y + 12, ctx.color, 3, 260);
      slash(s, p.x - dir * 12, p.y + 12, p.x + dir * 12, p.y - 12, ctx.color, 3, 260);
      await ctx.impact();
      await wait(s, 120);
      for (const k of [0.5, 1]) { rig.ghost(0.25); await tween(s, { targets: rig.c, x: land + (rig.homeX - land) * k, duration: 80 }); }
    }
  },

  ...MORE_APEX,
  ...COAST_APEX
};
