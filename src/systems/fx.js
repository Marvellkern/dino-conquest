import { text } from '../ui/font.js';
import { pixelCircle, pixelLine } from '../ui/pixel.js';
import { render } from '../render/quality.js';

const easeOut = (t) => t * (2 - t);
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);

// Hit feedback toolkit. One instance per scene; call update(dt) every frame.
// Visual-only randomness uses Math.random (gameplay rolls use the seeded RNG).
export class Fx {
  constructor(scene) {
    this.s = scene;
    this.sh = null;
    scene.events.once('shutdown', () => clearTimeout(this.hs));
  }

  // Shake and the kill push-in both move the camera from `base` (its scroll when the first
  // one started) and put it back exactly when both are over. The camera's own zoom is the
  // render scale (render/quality.js); the push-in multiplies it and shifts the scroll so it
  // zooms toward the middle of the screen (the camera zooms from its top-left corner).
  update(dt) {
    const sh = this.sh, push = this.push;
    if (!sh && !push) return;
    const cam = this.s.cameras.main, b = this.base;
    if (sh) {
      sh.t += dt * this.s.time.timeScale;
      if (sh.t >= sh.ms) this.sh = null;
      else if (this.s.time.timeScale !== 0) { // the offset freezes during hitstop
        const a = Math.max(1, Math.round(sh.px * (1 - sh.t / sh.ms)));
        sh.dx = Phaser.Math.Between(-a, a);
        sh.dy = Phaser.Math.Between(-a, a);
      }
    }
    let k = 1;
    if (push) {
      const t = Date.now() - push.t0; // real time: the push-in ignores the slow-motion
      if (t >= push.end) this.push = null;
      else k = 1 + 0.05 * (t < push.in ? easeOut(t / push.in) : t < push.out ? 1 : 1 - easeInOut((t - push.out) / (push.end - push.out)));
    }
    if (!this.sh && !this.push) { cam.setZoom(render.rs).setScroll(b.x, b.y); this.base = null; return; }
    const hw = cam.width / (2 * render.rs), hh = cam.height / (2 * render.rs);
    cam.setZoom(render.rs * k);
    cam.setScroll(b.x + (this.sh?.dx ?? 0) + hw * (1 - 1 / k), b.y + (this.sh?.dy ?? 0) + hh * (1 - 1 / k));
  }

  holdBase() {
    const cam = this.s.cameras.main;
    this.base ??= { x: cam.scrollX, y: cam.scrollY };
  }

  // Integer-pixel screen shake. Respects the 'shake' setting in the registry.
  shake(px = 2, ms = 120) {
    if (this.s.registry.get('shake') === false) return;
    if (!Number.isFinite(px) || px <= 0) return; // a NaN offset would scroll the camera into the void
    if (this.sh && this.sh.px > px) return;
    this.holdBase(); // shake around where the camera is (the portrait map scrolls)
    this.sh = { px, ms, t: 0, dx: 0, dy: 0 };
  }

  // Freeze the scene clock + tweens for a moment (real time).
  hitstop(ms = 60) {
    const s = this.s;
    s.time.timeScale = 0;
    s.tweens.timeScale = 0;
    clearTimeout(this.hs);
    this.hs = setTimeout(() => { s.time.timeScale = 1; s.tweens.timeScale = 1; }, ms);
  }

  // Killing blow: brief slow-motion plus a slight camera push-in.
  killCam(ms = 120) {
    const s = this.s;
    s.time.timeScale = 0.3;
    s.tweens.timeScale = 0.3;
    clearTimeout(this.hs);
    this.hs = setTimeout(() => { s.time.timeScale = 1; s.tweens.timeScale = 1; }, ms);
    this.holdBase(); // a 5% push-in: 90ms in, held, 220ms back out (see update)
    this.push = { t0: Date.now(), in: 90, out: ms + 60, end: ms + 60 + 220 };
  }

  sparks(x, y, { count = 8, dir = 1, big = false, gold = false } = {}) {
    for (let i = 0; i < count; i++) {
      const size = big && i % 3 === 0 ? 2 : 1;
      const r = this.s.add.rectangle(x, y, size, size, gold ? (i % 2 ? 0xffd040 : 0xffa020) : i % 2 ? 0xfff096 : 0xffffff).setOrigin(0).setDepth(20);
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

  // Damage number in the 2x font, rising on a slight arc. Crits flash white
  // for a frame, then turn gold.
  number(x, y, n, { crit = false, color = '#ffffff' } = {}) {
    const t = text(this.s, x, y, String(n), { scale: 2, color: crit ? '#ffffff' : color, origin: 0.5 }).setDepth(25);
    if (crit) this.s.time.delayedCall(34, () => t.active && t.label.setTint(0xfeae34));
    const dx = (Math.random() < 0.5 ? -1 : 1) * (crit ? 8 : 5);
    this.s.tweens.add({ targets: t, y: `-=${crit ? 20 : 14}`, duration: 460, ease: 'Quad.Out' });
    this.s.tweens.add({ targets: t, x: x + dx, duration: 460, ease: 'Sine.In' });
    this.s.time.delayedCall(820, () => t.destroy());
  }

  // Dust puff at the feet (landings, lunges): a few pale pixels kicked sideways.
  dust(x, y, n = 6) {
    for (let i = 0; i < n; i++) {
      const dir = i % 2 ? 1 : -1, r = this.s.add.rectangle(x + dir * (2 + i), y - 1, 2, 1, i % 3 ? 0xc28569 : 0xead4aa).setOrigin(0).setDepth(6);
      this.s.tweens.add({
        targets: r, x: r.x + dir * (6 + Math.random() * 10), y: y - 2 - Math.random() * 5, alpha: 0,
        duration: 260 + Math.random() * 160, ease: 'Quad.Out', onComplete: () => r.destroy()
      });
    }
  }

  // Impact debris (no blood): leaves in the Jungle, water drops in the Swamp.
  debris(x, y, zone = 'jungle', n = 4) {
    const colors = zone === 'swamp' ? [0x8b9bb4, 0xc0cbdc] : [0x63c74d, 0x3e8948];
    for (let i = 0; i < n; i++) {
      const r = this.s.add.rectangle(x, y, 2, 1, colors[i % 2]).setOrigin(0).setDepth(20);
      const dx = (Math.random() - 0.5) * 30;
      this.s.tweens.add({ targets: r, x: x + dx, y: y - 6 - Math.random() * 8, duration: 160, ease: 'Quad.Out' });
      this.s.tweens.add({ targets: r, y: y + 18 + Math.random() * 10, alpha: 0, delay: 160, duration: 420, ease: 'Quad.In', onComplete: () => r.destroy() });
    }
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
