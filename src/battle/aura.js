import { AURA } from '../data/flow.js';
import { glowTexture } from '../render/atmos.js';

// The streak aura around the player's dino (data/flow.js AURA): a faint shimmer from a
// 1-perfect streak, flames at the feet from 3, a full aura plus a soft light from 5.
// Small additive pixels, spawned on a timer; none while a QTE is open (the QTE
// performance rule), and no new ones once the streak breaks (the old ones fade out).
const ADD = Phaser.BlendModes.ADD;
const lighten = (c) => { const r = c >> 16, g = (c >> 8) & 255, b = c & 255, k = (v) => Math.round(v + (255 - v) * 0.5); return (k(r) << 16) | (k(g) << 8) | k(b); };

export class Aura {
  constructor(scene, rig) {
    this.s = scene;
    this.rig = rig;
    this.level = 0;
    this.t = 0;
    this.light = null;
    this.upd = (_, dt) => this.update(dt);
    scene.events.on('update', this.upd);
    scene.events.once('shutdown', () => { scene.events.off('update', this.upd); this.lightOff(); });
  }

  set(level) {
    this.level = level;
    if (level >= AURA.full && !this.light) {
      const L = AURA.light;
      this.light = this.s.lighting?.steady(L.radius, L.color, 0) ?? null;
      if (this.light) this.s.tweens.add({ targets: this.light, intensity: L.intensity, duration: 300 });
    } else if (level < AURA.full) this.lightOff();
  }

  // Primal Surge: a full flickering aura in the species' color, and a real light that colors
  // the arena. off: it fades away.
  surge(color) {
    this.surgeColors = color == null ? null : [color, lighten(color), 0xffffff];
    const old = this.sLight;
    if (old) { this.sLight = null; this.s.tweens.add({ targets: old, intensity: 0, duration: 500, onComplete: () => this.s.lighting?.release(old) }); }
    this.sGlow?.destroy();
    this.sGlow = null;
    if (color != null) {
      this.sLight = this.s.lighting?.steady(120, color, 0) ?? null;
      if (this.sLight) this.s.tweens.add({ targets: this.sLight, intensity: 1.5, duration: 250 });
      // Low quality (no real lights): a soft additive glow instead.
      else this.sGlow = this.s.add.image(0, 0, glowTexture(this.s)).setTint(color).setBlendMode(ADD).setDepth(4.8).setDisplaySize(130, 110).setAlpha(0.45);
    }
  }

  // The color variant's own soft glow (data/variants.js), on for the whole fight.
  glow(color) {
    this.vLight = this.s.lighting?.steady(60, color, 0.6) ?? null;
  }

  lightOff() {
    const l = this.light;
    if (!l) return;
    this.light = null;
    this.s.tweens.add({ targets: l, intensity: 0, duration: 400, onComplete: () => this.s.lighting?.release(l) });
  }

  update(dt) {
    const rig = this.rig;
    if (this.light) this.light.setPosition(rig.x, rig.y - rig.h * rig.scale * 0.5);
    if (this.vLight) this.vLight.setPosition(rig.x, rig.y - rig.h * rig.scale * 0.4);
    if (this.sLight) this.sLight.setPosition(rig.x, rig.y - rig.h * rig.scale * 0.5).setIntensity(1.3 + Math.random() * 0.4); // flicker
    if (this.sGlow) this.sGlow.setPosition(rig.x, rig.y - rig.h * rig.scale * 0.45).setAlpha(0.35 + Math.random() * 0.15);
    const lv = this.surgeColors ? 6 : this.level;
    if (lv < AURA.shimmer || !rig.c.visible) return;
    this.t += dt;
    const every = lv >= AURA.full ? 35 : lv >= AURA.flames ? 70 : 240;
    if (this.t < every || this.s.qteActive > 0) return;
    this.t = 0;
    const w = rig.halfW * 2, h = rig.h * rig.scale;
    if (lv >= AURA.full) this.flame(rig.x + Phaser.Math.Between(-w / 2, w / 2), rig.y - Phaser.Math.Between(0, h), 2, 22);
    if (lv >= AURA.flames) this.flame(rig.x + Phaser.Math.Between(-w / 2, w / 2), rig.y - 1, lv >= AURA.full ? 2 : 1, 12);
    else this.spark(rig.x + Phaser.Math.Between(-w / 2, w / 2), rig.y - Phaser.Math.Between(4, h));
  }

  // A rising flame pixel.
  flame(x, y, size, rise) {
    const c = Phaser.Utils.Array.GetRandom(this.surgeColors ?? AURA.colors);
    const r = this.s.add.rectangle(Math.round(x), Math.round(y), size, size, c, 0.9).setBlendMode(ADD).setDepth(6);
    this.s.tweens.add({ targets: r, y: r.y - rise, alpha: 0, duration: 420, ease: 'Quad.Out', onComplete: () => r.destroy() });
  }

  // A twinkle that blinks in and out.
  spark(x, y) {
    const r = this.s.add.rectangle(Math.round(x), Math.round(y), 1, 1, 0xfff6c8, 0).setBlendMode(ADD).setDepth(6);
    this.s.tweens.add({ targets: r, alpha: 0.9, duration: 160, yoyo: true, onComplete: () => r.destroy() });
  }
}
