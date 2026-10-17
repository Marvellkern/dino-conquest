import { W, H, GROUND_Y } from '../config.js';
import { text } from '../ui/font.js';
import { pixelCircle } from '../ui/pixel.js';
import { sfx } from '../systems/sfx.js';
import { wait, roar } from './anims.js';

// Short animations for the v2 combat gimmicks (defend, brace, submerge, flood,
// summons, boss phase 2, enemy death). All return promises.

const tween = (s, cfg) => new Promise((r) => s.tweens.add({ ...cfg, onComplete: r }));

// Shield rings around a rig (enemy Defend, player Brace).
function shieldRings(s, rig, color) {
  const c = rig.center(), g = s.add.graphics().setDepth(19), o = { r: rig.halfW + 6 };
  s.tweens.add({
    targets: o, r: rig.halfW - 2, duration: 260, ease: 'Quad.Out',
    onUpdate: () => { g.clear(); pixelCircle(g, c.x, c.y, o.r, color); pixelCircle(g, c.x, c.y, o.r + 2, color, 0.5); },
    onComplete: () => s.time.delayedCall(120, () => g.destroy())
  });
}

export async function defendAnim(s, rig) {
  rig.setPose({ crouch: true, gap: 0 });
  shieldRings(s, rig, 0x9ab8ff);
  sfx('block');
  const p = rig.top();
  s.fx.pop(p.x, p.y, 'GUARD', '#9ab8ff', 1, 700);
  await wait(s, 420);
  rig.setPose({});
}

export async function braceAnim(s, rig) {
  rig.setPose({ crouch: true, body: -1 });
  shieldRings(s, rig, 0x7fe0ff);
  sfx('block');
  const p = rig.top();
  s.fx.pop(p.x, p.y, 'BRACED', '#7fe0ff', 1, 700);
  await wait(s, 380);
  rig.setPose({});
}

function bubbles(s, x, y, n = 6) {
  for (let i = 0; i < n; i++) {
    const b = s.add.rectangle(x + Phaser.Math.Between(-14, 14), y, 2, 2, 0x7fe0ff).setDepth(19);
    s.tweens.add({ targets: b, y: y - Phaser.Math.Between(8, 22), alpha: 0, duration: 400 + i * 40, onComplete: () => b.destroy() });
  }
}

// Sarco dives: sinks and fades; stays like that while submerged.
export async function submergeAnim(s, rig) {
  rig.stopIdle();
  sfx('whoosh');
  bubbles(s, rig.x, rig.homeY - 4, 8);
  await tween(s, { targets: rig.c, y: rig.homeY + 8, alpha: 0.3, duration: 360, ease: 'Quad.In' });
  s.fx.pop(rig.x, rig.homeY - 24, 'SUBMERGED', '#5aa0e0', 1, 700);
}

export async function surfaceAnim(s, rig) {
  bubbles(s, rig.x, rig.homeY - 4, 10);
  sfx('dodge');
  await tween(s, { targets: rig.c, y: rig.homeY, alpha: 1, duration: 200, ease: 'Quad.Out' });
}

// Muddy water floods the arena, then drains away.
export async function floodAnim(s, braced) {
  const g = s.add.graphics().setDepth(9), o = { h: 0 };
  sfx('roar');
  await tween(s, {
    targets: o, h: 26, duration: 420, ease: 'Quad.Out',
    onUpdate: () => {
      g.clear();
      g.fillStyle(0x3a5a48, 0.75).fillRect(0, GROUND_Y + 2 - o.h, W, o.h);
      g.fillStyle(0x7fa890, 0.8).fillRect(0, GROUND_Y + 2 - o.h, W, 1);
    }
  });
  s.fx.shake(2, 200);
  s.fx.pop(72, 96, braced ? 'BRACED!' : 'MUDDY!', braced ? '#7fe0ff' : '#b09a62', 1, 900);
  await wait(s, 300);
  await tween(s, { targets: g, alpha: 0, duration: 300 });
  g.destroy();
}

// A summoned enemy runs in from the right edge.
export async function enterAnim(s, rig) {
  rig.x = W + rig.halfW;
  rig.stopIdle();
  await tween(s, { targets: rig.c, x: rig.homeX, duration: 380, ease: 'Quad.Out' });
  s.fx.shake(1, 100);
  sfx('step');
  rig.startIdle();
}

// Boss crosses into phase 2: red flash, roar, banner line.
export async function phaseAnim(s, rig, line) {
  const f = s.add.rectangle(0, 0, W, H, 0xc8281e, 0.45).setOrigin(0).setDepth(45);
  s.tweens.add({ targets: f, alpha: 0, duration: 700, onComplete: () => f.destroy() });
  const t = text(s, W / 2, 70, line, { scale: 2, color: '#ff6040', origin: 0.5 }).setDepth(46);
  s.fx.shake(4, 500);
  rig.stopIdle();
  await roar(s, rig, () => {});
  await wait(s, 300);
  t.destroy();
  rig.startIdle();
}

// Enemy defeated: blinks, then fades and sinks.
export async function deathAnim(s, rig) {
  rig.stopIdle();
  sfx('ko');
  for (let i = 0; i < 6; i++) { rig.c.setVisible(i % 2 === 1); await wait(s, 60); }
  await tween(s, { targets: rig.c, alpha: 0, y: rig.homeY + 4, duration: 300 });
  rig.c.setVisible(false);
}
