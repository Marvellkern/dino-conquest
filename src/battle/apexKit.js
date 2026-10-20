import { W, H, lp } from '../config.js';
import { APEX } from '../data/surge.js';
import { music } from '../systems/music.js';
import { text } from '../ui/font.js';
import { wait } from './anims.js';
import { sfx } from '../systems/sfx.js';

// Small building blocks for the Apex Strike animations (battle/apexMoves*.js). Visual only:
// Math.random is fine here. Everything is short: one beat is ~0.4s of real time at half speed.
export { wait };
export const tween = (s, cfg) => new Promise((r) => s.tweens.add({ ...cfg, onComplete: r }));
const ADD = Phaser.BlendModes.ADD;

// Where an attacker stands to hit a target (overlap px).
export const standX = (rig, target, overlap = 10) => Math.round(target.homeX - rig.homeFacing * (rig.halfW + target.halfW - overlap));

// A copy of a rig's current look as one container (ghost raptors, afterimages, the
// spectral ancestor). tint: a fill tint or null; alpha.
export function cloneRig(s, rig, { tint = null, alpha = 1, depth = 8 } = {}) {
  const c = s.add.container(rig.c.x, rig.c.y).setScale(rig.c.scaleX, rig.c.scaleY).setDepth(depth).setAlpha(alpha);
  for (const p of rig.parts) {
    if (!p.visible) continue;
    const img = s.add.image(p.x, p.y, p.texture.key).setOrigin(0);
    if (tint != null) img.setTintFill(tint);
    c.add(img);
  }
  return c;
}

// A line that flashes across and fades (claw slashes, speed streaks).
export function slash(s, x1, y1, x2, y2, color = 0xffffff, width = 2, ms = 180) {
  const g = s.add.graphics().setDepth(9).setBlendMode(ADD);
  g.lineStyle(width, color, 1).lineBetween(x1, y1, x2, y2);
  g.lineStyle(1, 0xffffff, 1).lineBetween(x1, y1, x2, y2);
  s.tweens.add({ targets: g, alpha: 0, duration: ms, onComplete: () => g.destroy() });
}

// A crack running along the ground from x (dir), jagged, fading out.
export function crack(s, x, y, dir, len = 40, color = 0x0c0e12) {
  const g = s.add.graphics().setDepth(4.6);
  let cx = x, cy = y;
  g.lineStyle(1, color, 1);
  for (let i = 0; i < len; i += 4) {
    const nx = cx + dir * 4, ny = y + Phaser.Math.Between(-1, 1);
    g.lineBetween(cx, cy, nx, ny);
    cx = nx; cy = ny;
  }
  s.tweens.add({ targets: g, alpha: 0, delay: 500, duration: 500, onComplete: () => g.destroy() });
}

// A small glowing shot from (x0, y0) to (x1, y1).
export function shoot(s, x0, y0, x1, y1, color, ms = 120, size = 3) {
  const r = s.add.rectangle(x0, y0, size, size, color).setDepth(9).setBlendMode(ADD);
  return tween(s, { targets: r, x: x1, y: y1, duration: ms, ease: 'Quad.In' }).then(() => r.destroy());
}

// A puff of colored pixels (poison clouds, spray, stars).
export function puff(s, x, y, color, n = 8, spread = 14, ms = 420) {
  for (let i = 0; i < n; i++) {
    const r = s.add.rectangle(x, y, 2, 2, color, 0.9).setDepth(9).setBlendMode(ADD);
    s.tweens.add({ targets: r, x: x + Phaser.Math.Between(-spread, spread), y: y + Phaser.Math.Between(-spread, spread / 2), alpha: 0, duration: ms, onComplete: () => r.destroy() });
  }
}

// The standard per-beat hit on a target rig: a flash, sparks, a small knock and a shake.
export function beatHit(s, ctx, t, k, big = false) {
  const p = t.hitPoint();
  t.flash(40);
  s.fx.sparks(p.x, p.y, { count: big ? 12 : 6 + k, dir: ctx.dir, big, gold: ctx.res === 'perfect' });
  s.fx.shake(1 + Math.floor(k / 2), 90);
  sfx('beat', k); // each beat a step higher
  const x0 = t.homeX;
  t.x = x0 + ctx.dir * 3;
  s.time.delayedCall(60, () => { t.x = x0; });
}

// The last hit lands: everything at once.
export function impact(s, ctx, out) {
  const all = out.perfect === APEX.beats; // out: { hits: [{ e, dmg, killed }], perfect }
  s.fx.hitstop(APEX.hitstopMs);
  s.fx.shake(8, 600);
  sfx('crit');
  sfx('boom');
  music.duck(500);
  const flash = s.add.rectangle(0, 0, W, H, 0xffffff, all ? 0.95 : 0.8).setOrigin(0).setDepth(39);
  s.tweens.add({ targets: flash, alpha: 0, duration: 260, onComplete: () => flash.destroy() });
  s.lighting?.burst(W / 2, H / 2, { color: 0xffffff, radius: 600, intensity: 2.5, ms: 350 }); // the whole arena lights up
  for (const h of out.hits) {
    const t = h.e.rig;
    if (!t.c.active) continue;
    const p = t.hitPoint();
    t.flash(80);
    shock(s, p.x, p.y, ctx.color);
    s.fx.sparks(p.x, p.y, { count: 20, dir: ctx.dir, big: true, gold: true });
    s.lighting?.burst(p.x, p.y, { color: ctx.color, radius: 200, intensity: 3, ms: 400 });
    const n = text(s, p.x, p.y - 24, String(h.dmg), { scale: 3, color: all ? '#ffd040' : '#ffffff', origin: 0.5 }).setDepth(32);
    s.time.delayedCall(APEX.numberMs, () => s.tweens.add({ targets: n, y: n.y - 10, alpha: 0, duration: 300, onComplete: () => n.destroy() }));
    s.afterDamage(h.e, { killed: h.killed });
  }
  if (all) {
    music.stinger('apex');
    const a = text(s, W / 2, lp(46, 70), 'APEX!', { scale: 3, color: '#ffd040', origin: 0.5 }).setDepth(41);
    s.tweens.add({ targets: a, alpha: 0, delay: 500, duration: 300, onComplete: () => a.destroy() });
  }
  return wait(s, 120);
}

function shock(s, x, y, color) {
  const g = s.add.graphics().setDepth(9), o = { r: 4, a: 1 };
  s.tweens.add({
    targets: o, r: 90, a: 0, duration: 400, ease: 'Quad.Out',
    onUpdate: () => g.clear().lineStyle(3, color, o.a).strokeCircle(x, y, o.r).lineStyle(1, 0xffffff, o.a).strokeCircle(x, y, o.r * 0.7),
    onComplete: () => g.destroy()
  });
}
