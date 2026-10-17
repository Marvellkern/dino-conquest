import { text } from '../ui/font.js';
import { pixelCircle, pixelLine } from '../ui/pixel.js';

// Hit feedback toolkit. One instance per scene; call update(dt) every frame.
// Visual-only randomness uses Math.random (gameplay rolls use the seeded RNG).
export class Fx {
  constructor(scene) {
    this.s = scene;
    this.sh = null;
    scene.events.once('shutdown', () => clearTimeout(this.hs));
  }

  update(dt) {
    const sh = this.sh;
    if (!sh) return;
    const cam = this.s.cameras.main;
    sh.t += dt * this.s.time.timeScale;
    if (sh.t >= sh.ms) { cam.setScroll(0, 0); this.sh = null; return; }
    if (this.s.time.timeScale === 0) return; // freeze the offset during hitstop
    const a = Math.max(1, Math.round(sh.px * (1 - sh.t / sh.ms)));
    cam.setScroll(Phaser.Math.Between(-a, a), Phaser.Math.Between(-a, a));
  }

  // Integer-pixel screen shake. Respects the 'shake' setting in the registry.
  shake(px = 2, ms = 120) {
    if (this.s.registry.get('shake') === false) return;
    if (this.sh && this.sh.px > px) return;
    this.sh = { px, ms, t: 0 };
  }

  // Freeze the scene clock + tweens for a moment (real time).
  hitstop(ms = 60) {
    const s = this.s;
    s.time.timeScale = 0;
    s.tweens.timeScale = 0;
    clearTimeout(this.hs);
    this.hs = setTimeout(() => { s.time.timeScale = 1; s.tweens.timeScale = 1; }, ms);
  }

  sparks(x, y, { count = 8, dir = 1, big = false } = {}) {
    for (let i = 0; i < count; i++) {
      const size = big && i % 3 === 0 ? 2 : 1;
      const r = this.s.add.rectangle(x, y, size, size, i % 2 ? 0xfff096 : 0xffffff).setOrigin(0).setDepth(20);
      const a = (dir > 0 ? 0 : Math.PI) + (Math.random() - 0.5) * 2.4;
      const d = (big ? 14 : 8) + Math.random() * (big ? 18 : 10);
      this.s.tweens.add({
        targets: r, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d - 3,
        duration: 180 + Math.random() * 140, ease: 'Quad.Out', onComplete: () => r.destroy()
      });
    }
  }

  impactStar(x, y) {
    const img = this.s.add.image(x, y, 'impact').setScale(2).setDepth(21);
    this.s.time.delayedCall(90, () => img.destroy());
  }

  number(x, y, n, { crit = false, color = '#ffffff' } = {}) {
    const t = text(this.s, x, y, String(n), { scale: crit ? 2 : 1, color: crit ? '#fff096' : color, origin: 0.5 }).setDepth(25);
    this.s.tweens.add({ targets: t, y: '-=14', duration: 420, ease: 'Quad.Out' });
    this.s.time.delayedCall(800, () => t.destroy());
  }

  pop(x, y, str, color = '#ffffff', scale = 1, ms = 650) {
    const t = text(this.s, x, y, str, { scale, color, origin: 0.5 }).setDepth(26);
    this.s.tweens.add({ targets: t, y: '-=6', duration: 200, ease: 'Quad.Out' });
    this.s.time.delayedCall(ms, () => t.destroy());
    return t;
  }

  // Claw slash: two parallel white diagonals, 60ms.
  slash(x, y, dir = 1) {
    const g = this.s.add.graphics().setDepth(21);
    for (const o of [-3, 3]) pixelLine(g, x - 7 * dir + o, y - 8, x + 7 * dir + o, y + 8, 0xffffff);
    this.s.time.delayedCall(60, () => g.destroy());
  }

  // Tail whip: chunky white arc, 80ms.
  arc(x, y, dir = 1) {
    const g = this.s.add.graphics().setDepth(21);
    g.fillStyle(0xffffff);
    const cx = x - dir * 8;
    for (let a = -1.2; a <= 1.2; a += 0.08) {
      g.fillRect(Math.round(cx + dir * Math.cos(a) * 12), Math.round(y + Math.sin(a) * 12), 2, 1);
    }
    this.s.time.delayedCall(80, () => g.destroy());
  }

  // Roar shockwave ring.
  rings(x, y, color = 0xf0ecdc) {
    const g = this.s.add.graphics().setDepth(19);
    const o = { r: 3 };
    this.s.tweens.add({
      targets: o, r: 30, duration: 360, ease: 'Quad.Out',
      onUpdate: () => { g.clear(); pixelCircle(g, x, y, o.r, color, 1 - o.r / 34); },
      onComplete: () => g.destroy()
    });
  }
}
