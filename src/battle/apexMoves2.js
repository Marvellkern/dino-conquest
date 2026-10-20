import { W } from '../config.js';
import { sfx } from '../systems/sfx.js';
import { wait, tween, standX, cloneRig, slash, crack, shoot, puff, beatHit } from './apexKit.js';

// The other 11 Apex Strikes (see battle/apexMoves.js for the shape of a set).
const off = (ctx) => (ctx.dir > 0 ? -40 : W + 40);
const hitAll = (ctx, i, big = false) => { for (const t of ctx.all) beatHit(ctx.s, ctx, t, i, big); };
const far = (ctx) => Math.max(...ctx.all.map((t) => t.homeX * ctx.dir)) * ctx.dir; // past the last target
const home = (s, rig, ms = 160) => tween(s, { targets: rig.c, x: rig.homeX, y: rig.homeY, duration: ms, ease: 'Quad.Out' });
const extra = (ctx, x, y) => { if (ctx.evo >= 2) puff(ctx.s, x, y, ctx.color, 6, 16); }; // evolved forms: more sparks

export const MORE_APEX = {
  // Carno, Horned Rampage: dashes clean through the target every beat, leaving afterimages.
  carno: {
    beat(ctx, i) {
      const { s, rig, t, dir } = ctx, to = i % 2 ? standX(rig, t, 6) - dir * 30 : t.homeX + dir * (t.halfW + 20);
      rig.ghost(0.5, 200);
      s.tweens.add({ targets: rig.c, x: to, duration: 90, ease: 'Quad.In', onUpdate: () => rig.ghost(0.3, 120) });
      rig.setFacing(i % 2 ? -dir : dir); // faces the way it's dashing
      beatHit(s, ctx, t, i);
      sfx('whoosh');
      extra(ctx, t.hitPoint().x, t.hitPoint().y);
    },
    async finale(ctx) {
      const { s, rig, t, dir } = ctx;
      await tween(s, { targets: rig.c, x: standX(rig, t, 6) - dir * 50, duration: 80 });
      rig.setFacing(dir);
      rig.ghost(0.6, 300);
      await tween(s, { targets: rig.c, x: t.homeX + dir * (t.halfW + 30), duration: 70, ease: 'Quad.In', onUpdate: () => rig.ghost(0.4, 160) });
      await ctx.impact();
      await wait(s, 140);
      rig.setFacing(-dir);
      await home(s, rig);
    }
  },

  // Compy, Swarm Tide: waves of tiny compies flood across the screen, bigger every beat.
  compy: {
    beat(ctx, i) { wave(ctx, 2 + i, () => hitAll(ctx, i)); },
    async finale(ctx) {
      const { s, rig, t } = ctx;
      wave(ctx, 9, () => {});
      await wait(s, 90);
      await tween(s, { targets: rig.c, x: standX(rig, t, 8), y: rig.homeY - 10, duration: 80, ease: 'Quad.Out' });
      rig.y = rig.homeY;
      await ctx.impact();
      await wait(s, 120);
      await home(s, rig);
    }
  },

  // Trike, Stampede: horns glowing, it charges through every enemy, kicking up dust.
  trike: {
    async start({ s, rig }) { rig.setPose({ crouch: true }); await wait(s, 80); rig.setPose({}); },
    beat(ctx, i) {
      const { s, rig, dir } = ctx, m = rig.mouth();
      puff(s, m.x, m.y, ctx.color, 5 + i, 8);
      s.fx.dust(rig.x - dir * 8, rig.homeY, 3);
      rig.x += dir * 4;
      beatHit(s, ctx, ctx.all[i % ctx.all.length], i);
    },
    async finale(ctx) {
      const { s, rig, dir } = ctx;
      sfx('whoosh');
      await tween(s, {
        targets: rig.c, x: far(ctx) + dir * 40, duration: 160, ease: 'Quad.In',
        onUpdate: () => { s.fx.dust(rig.x - dir * 10, rig.homeY, 1); rig.ghost(0.3, 140); }
      });
      await ctx.impact();
      await wait(s, 120);
      rig.x = off(ctx);
      await home(s, rig, 220);
    }
  },

  // Ankylo, Earthshaker: the tail club slams the ground on every beat; cracks run out to the enemies.
  ankylo: {
    beat(ctx, i) {
      const { s, rig, dir } = ctx;
      rig.setPose({ crouch: true });
      s.time.delayedCall(60, () => rig.setPose({}));
      s.fx.shake(2 + Math.floor(i / 2), 120);
      crack(s, rig.x + dir * rig.halfW, rig.homeY, dir, 30 + i * 12);
      for (const t of ctx.all) s.fx.dust(t.homeX, t.homeY, 3);
      hitAll(ctx, i);
      extra(ctx, rig.x, rig.homeY - 4);
    },
    async finale(ctx) {
      const { s, rig, dir } = ctx;
      await tween(s, { targets: rig.c, y: rig.homeY - 10, duration: 80, ease: 'Quad.Out' });
      await tween(s, { targets: rig.c, y: rig.homeY, duration: 50, ease: 'Quad.In' });
      for (let k = 0; k < 4; k++) crack(s, rig.x + dir * rig.halfW, rig.homeY - k, dir, 140);
      for (const t of ctx.all) s.fx.debris(t.homeX, t.homeY, s.zone, 6);
      await ctx.impact();
      await wait(s, 200);
    }
  },

  // Pachy, Skullquake: a headbutt combo, each bash bigger, with stars.
  pachy: {
    beat(ctx, i) {
      const { s, rig, t, dir } = ctx, x = standX(rig, t, 8);
      s.tweens.add({ targets: rig.c, x, duration: 60, yoyo: true, hold: 20, ease: 'Quad.In' });
      s.time.delayedCall(60, () => {
        const p = t.top();
        beatHit(s, ctx, t, i, i >= 3);
        for (let k = 0; k <= i; k++) s.fx.pop(p.x + Phaser.Math.Between(-10, 10), p.y + Phaser.Math.Between(-4, 6), '*', '#fff096', 1, 400);
      });
      rig.x = rig.homeX + dir * 2;
    },
    async finale(ctx) {
      const { s, rig, t, dir } = ctx;
      await tween(s, { targets: rig.c, x: rig.homeX - dir * 14, duration: 90 });
      await tween(s, { targets: rig.c, x: standX(rig, t, 10), duration: 70, ease: 'Quad.In', onUpdate: () => rig.ghost(0.3, 140) });
      puff(s, t.top().x, t.top().y, 0xfff096, 14, 22);
      await ctx.impact();
      await wait(s, 140);
      await home(s, rig);
    }
  },

  // Stego, Spike Storm: its plates fire spikes into the sky that rain down on the enemies.
  stego: {
    beat(ctx, i) {
      const { s, rig } = ctx, top = rig.top();
      for (let k = 0; k < 2 + Math.floor(i / 2); k++) shoot(s, top.x - 6 + k * 6, top.y, top.x - 6 + k * 6, -10, ctx.color, 90, 2);
      sfx('whoosh');
      s.time.delayedCall(110, () => ctx.all.forEach((t) => {
        const p = t.hitPoint();
        shoot(s, p.x + Phaser.Math.Between(-8, 8), -10, p.x, p.y, ctx.color, 90, 2).then(() => beatHit(s, ctx, t, i));
      }));
    },
    async finale(ctx) {
      const { s } = ctx;
      for (const t of ctx.all) for (let k = 0; k < 8; k++) {
        const p = t.hitPoint();
        shoot(s, p.x + Phaser.Math.Between(-24, 24), -10 - k * 6, p.x + Phaser.Math.Between(-6, 6), p.y, ctx.color, 120, 2);
      }
      await wait(s, 130);
      await ctx.impact();
      await wait(s, 200);
    }
  },

  // Spino, Tidal Maw: a wave rises behind it; it rides in and bites on every beat.
  spino: {
    async start(ctx) {
      const { s, rig } = ctx;
      ctx.wave = s.add.rectangle(rig.x - ctx.dir * 10, rig.homeY, rig.halfW * 3, 0, 0x0099db, 0.6).setOrigin(0.5, 1).setDepth(7.9);
      await tween(s, { targets: ctx.wave, height: 34, duration: 140, ease: 'Quad.Out' });
    },
    beat(ctx, i) {
      const { s, rig, t, dir } = ctx, x = rig.homeX + (standX(rig, t, 10) - rig.homeX) * ((i + 1) / 5);
      s.tweens.add({ targets: rig.c, x, duration: 80 });
      s.tweens.add({ targets: ctx.wave, x: x - dir * 10, duration: 80 });
      puff(s, rig.x, rig.homeY - 30, 0x9ae8ff, 4, 12);
      beatHit(s, ctx, t, i);
    },
    async finale(ctx) {
      const { s, rig, t } = ctx;
      await tween(s, { targets: ctx.wave, x: t.homeX, height: 50, duration: 100, ease: 'Quad.In' });
      puff(s, t.hitPoint().x, t.hitPoint().y, 0x9ae8ff, 16, 30);
      await ctx.impact();
      await tween(s, { targets: ctx.wave, height: 0, alpha: 0, duration: 200 });
      ctx.wave.destroy();
      await home(s, rig);
    }
  },

  // Sarco, Abyss Roll: grabs the target and death-rolls, spinning faster each beat.
  sarco: {
    async start({ s, rig, t }) { await tween(s, { targets: rig.c, x: standX(rig, t, 14), duration: 120, ease: 'Quad.In' }); },
    beat(ctx, i) {
      const { s, rig, t } = ctx, ms = 200 - i * 30;
      s.tweens.add({ targets: [rig.c, t.c], angle: '+=360', duration: ms, ease: 'Linear' });
      s.time.delayedCall(ms / 2, () => beatHit(s, ctx, t, i));
      puff(s, t.homeX, t.homeY - 4, 0x5aa0e0, 3 + i, 10);
    },
    async finale(ctx) {
      const { s, rig, t } = ctx;
      await tween(s, { targets: [rig.c, t.c], angle: '+=720', duration: 140, ease: 'Quad.In' });
      rig.c.setAngle(0);
      t.c.setAngle(0);
      s.fx.dust(t.homeX, t.homeY, 8);
      await ctx.impact();
      await wait(s, 140);
      await home(s, rig);
    }
  },

  // Pteranodon, Sky Strike: flies off the top of the screen and dives in from above every beat.
  ptera: {
    async start({ s, rig }) { sfx('whoosh'); await tween(s, { targets: rig.c, y: -30, duration: 120, ease: 'Quad.In' }); },
    beat(ctx, i) {
      const { s, rig, t, dir } = ctx, p = t.hitPoint();
      rig.x = p.x - dir * (20 + i * 4);
      rig.y = -30;
      s.tweens.add({
        targets: rig.c, x: p.x, y: p.y + 6, duration: 70, ease: 'Quad.In', onUpdate: () => rig.ghost(0.3, 120),
        onComplete: () => { beatHit(s, ctx, t, i); s.tweens.add({ targets: rig.c, y: -30, x: p.x + dir * 20, duration: 80, ease: 'Quad.Out' }); }
      });
    },
    async finale(ctx) {
      const { s, rig, t } = ctx, p = t.hitPoint();
      rig.x = p.x;
      rig.y = -40;
      await tween(s, { targets: rig.c, y: p.y + 8, duration: 90, ease: 'Quad.In', onUpdate: () => rig.ghost(0.4, 160) });
      await ctx.impact();
      await wait(s, 120);
      rig.x = rig.homeX;
      rig.y = -30;
      await home(s, rig, 200);
    }
  },

  // Dilophosaurus, Venom Bloom: the frill flares and it spits a burst every beat; poison clouds pop.
  dilo: {
    beat(ctx, i) {
      const { s, rig, t } = ctx, m = rig.mouth(), p = t.hitPoint();
      puff(s, m.x, m.y - 4, 0xb55088, 6, 10, 260); // the frill
      shoot(s, m.x, m.y, p.x, p.y, 0x7dff6a, 90).then(() => { puff(s, p.x, p.y, 0x63c74d, 8 + i * 2, 14 + i * 2); beatHit(s, ctx, t, i); });
    },
    async finale(ctx) {
      const { s, rig, t } = ctx, m = rig.mouth(), p = t.hitPoint();
      for (let k = 0; k < 5; k++) shoot(s, m.x, m.y, p.x + Phaser.Math.Between(-8, 8), p.y + Phaser.Math.Between(-8, 8), 0x7dff6a, 100 + k * 10);
      await wait(s, 120);
      puff(s, p.x, p.y, 0x63c74d, 24, 34, 600);
      await ctx.impact();
      await wait(s, 200);
    }
  },

  // Therizinosaurus, Reaper's Harvest: claw slashes cross the screen; an X on the last one.
  theri: {
    async start({ s, rig, t }) { await tween(s, { targets: rig.c, x: standX(rig, t, 4), duration: 120 }); },
    beat(ctx, i) {
      const { s, t, dir } = ctx, p = t.hitPoint(), up = i % 2 ? 1 : -1;
      slash(s, p.x - dir * 60, p.y + up * 20, p.x + dir * 60, p.y - up * 20, ctx.color, 2, 220);
      sfx('whoosh');
      beatHit(s, ctx, t, i);
      extra(ctx, p.x, p.y);
    },
    async finale(ctx) {
      const { s, t } = ctx, p = t.hitPoint();
      slash(s, p.x - 40, p.y - 40, p.x + 40, p.y + 40, ctx.color, 4, 400);
      slash(s, p.x - 40, p.y + 40, p.x + 40, p.y - 40, ctx.color, 4, 400);
      await wait(s, 60);
      await ctx.impact();
      await wait(s, 160);
      await home(s, ctx.rig);
    }
  }
};

// A wave of n ghost compies running across the ground through the enemies (Swarm Tide).
function wave(ctx, n, onHit) {
  const { s, rig, dir } = ctx, end = far(ctx) + dir * 60;
  sfx('whoosh');
  for (let k = 0; k < n; k++) {
    const g = cloneRig(s, rig, { tint: k % 2 ? 0x9fd8ff : null, alpha: 0.85 });
    g.setScale(g.scaleX * 0.5, g.scaleY * 0.5);
    g.x = off(ctx) - dir * k * 8;
    g.y = rig.homeY - (k % 3);
    s.tweens.add({ targets: g, x: end, duration: 200 + k * 10, ease: 'Linear', onComplete: () => g.destroy() });
  }
  s.time.delayedCall(140, onHit);
}
