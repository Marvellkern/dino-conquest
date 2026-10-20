import { W, GROUND_Y } from '../config.js';
import { TIERS } from '../data/quality.js';
import { LIGHTING, MOVE_LIGHTS, MOMENTS } from '../data/lighting.js';
import { render } from './quality.js';
import { ensureNormalMap } from './normals.js';
import { shadowTexture } from './atmos.js';

// A scene's real (Light2D) lights: the zone's ambient + key light, plus short bursts
// (hit sparks). Only on tiers with light2d; otherwise every method is a no-op, so
// callers never need to check the tier.
//   lit(rig)        light a rig's parts (normal maps are built on first use)
//   burst(x, y, o)  a light that flares and fades over o.ms (real time: it plays
//                   through hitstop). Over the tier's light cap, the oldest burst goes.
//   emitter(...)    a fixed zone light (lava, crystals); kept only while 2 slots stay
//                   free for bursts. steady(...): a moving extra (fireflies), only while
//                   4 stay free (so High only). Both return null when there's no room.
//   moments         roar(), bossPhase(), breach(x, y), lightning(), moveStart(id, x)
// Ambient moments mix the zone's ambient toward a color (or dim it) for a moment.
// Light slots, by priority: hits > boss moments > zone emitters > extras.
const mix = (a, b, k) => {
  const ch = (s) => Math.round(((a >> s) & 255) * (1 - k) + ((b >> s) & 255) * k);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
};
const scale = (c, m) => mix(0, c, m);

export class SceneLights {
  constructor(scene, zone, { progress = 0 } = {}) {
    const tier = TIERS[render.tier];
    this.scene = scene;
    this.on = !!tier.light2d && scene.renderer.type === Phaser.WEBGL && scene.renderer.pipelines.has('Lit');
    this.bursts = [];
    this.steadies = [];
    this.moments = [];
    if (!this.on) return;
    this.zone = zone;
    this.max = tier.lights;
    const L = LIGHTING[zone] ?? LIGHTING.jungle, k = L.key, bake = L.bake ?? {};
    this.ambient = L.ambient;
    scene.lights.enable().setAmbientColor(L.ambient);
    const x = k.side === 'right' ? W + k.dx : k.side === 'left' ? -k.dx : W / 2 + k.dx;
    const [i0, i1] = bake.keyByProgress ?? [k.intensity, k.intensity];
    this.keyBase = i0 + (i1 - i0) * Math.min(1, progress); // the Crater's meteor grows brighter
    this.keyPulse = bake.keyPulse ?? null;
    this.key = scene.lights.addLight(Math.round(x), GROUND_Y - k.dy, k.radius, k.color, this.keyBase);
    this.count();
    this.tick = () => this.update();
    scene.events.on('update', this.tick);
    scene.events.once('shutdown', () => { scene.events.off('update', this.tick); render.lights = 0; });
  }

  count() { render.lights = (this.key ? 1 : 0) + this.steadies.length + this.bursts.length; }

  // A long-lived light that stays while `reserve` slots remain free for bursts.
  hold(radius, color, intensity, reserve) {
    if (!this.on || this.max - 1 - this.steadies.length <= reserve) return null;
    const light = this.scene.lights.addLight(0, 0, radius, color, intensity);
    this.steadies.push(light);
    this.count();
    return light;
  }

  // Give back a held light.
  release(light) {
    if (!light) return;
    this.scene.lights.removeLight(light);
    this.steadies = this.steadies.filter((l) => l !== light);
    this.count();
  }

  steady(radius, color, intensity) { return this.hold(radius, color, intensity, 4); }
  emitter(x, y, radius, color, intensity) { return this.hold(radius, color, intensity, 2)?.setPosition(x, y) ?? null; }

  lit(rig) {
    if (!this.on || !rig) return rig;
    rig.setLit('Lit', (key) => ensureNormalMap(this.scene, key, rig.normalSource?.(key) ?? key));
    const sh = LIGHTING[this.zone]?.bake?.shadow; // baked tiers: a soft shadow cast away from the key light
    if (sh && TIERS[render.tier].baked) rig.softShadow(shadowTexture(this.scene), sh);
    return rig;
  }

  burst(x, y, { color, radius, intensity, ms }) {
    if (!this.on) return;
    while (this.bursts.length && 1 + this.steadies.length + this.bursts.length >= this.max) this.end(this.bursts[0]); // key + held lights keep their slots
    if (1 + this.steadies.length >= this.max) return; // no slot at all (never on Medium / High)
    const light = this.scene.lights.addLight(x, y, radius * 0.7, color, intensity);
    this.bursts.push({ light, t0: Date.now(), ms, radius, intensity });
    this.count();
  }

  end(b) {
    this.scene.lights.removeLight(b.light);
    this.bursts.splice(this.bursts.indexOf(b), 1);
    this.count();
  }

  // A hit's light: a special move's own color, else the warm spark.
  hitColor(move, spark) {
    const c = MOVE_LIGHTS[move]?.color;
    return c ? { ...spark, color: c, intensity: spark.intensity * 1.25 } : spark;
  }

  // A move starting: Starfall lights the fight from the sky.
  moveStart(move, x) {
    const sky = MOVE_LIGHTS[move]?.sky;
    if (sky) this.burst(x, -20, { color: MOVE_LIGHTS[move].color, ...sky });
  }

  // Ambient moments. fn(k) -> ambient color for k = 0..1 over ms.
  moment(ms, fn) { if (this.on) this.moments.push({ t0: Date.now(), ms, fn }); }

  roar() {
    const m = MOMENTS.roar, base = this.ambient;
    this.moment(m.ms, (k) => scale(base, 1 - (1 - m.mult) * Math.sin(k * Math.PI)));
  }

  bossPhase() {
    if (this.zone !== 'jungle') return; // Alpha Rex enrages: red pulses
    const m = MOMENTS.alphaRage, base = this.ambient;
    this.moment(m.ms * m.times, (k) => mix(base, m.color, Math.abs(Math.sin(k * Math.PI * m.times)) * 0.7));
  }

  // The Abyss Mosasaur's Breach: the scene goes dark, then a splash of light where it surfaces.
  breach(x, y) {
    const m = MOMENTS.breach, base = this.ambient;
    this.moment(m.darkMs, (k) => scale(base, k < 0.85 ? 0.15 : 0.15 + (k - 0.85) / 0.15 * 0.85));
    this.scene.time.delayedCall(m.darkMs, () => this.burst(x, y, m.splash));
  }

  // The Coast's lightning: everything lit for a couple of frames.
  lightning() {
    const m = MOMENTS.lightning, base = this.ambient;
    this.moment(m.ms, (k) => mix(base, m.color, 1 - k));
  }

  update() {
    const now = Date.now();
    for (const b of [...this.bursts]) {
      const k = (now - b.t0) / b.ms;
      if (k >= 1) { this.end(b); continue; }
      const fade = (1 - k) ** 1.5; // instant flash, then a quick fall-off
      b.light.setIntensity(b.intensity * fade);
      b.light.setRadius(b.radius * (0.7 + 0.3 * Math.min(1, k * 4)));
    }
    if (this.keyPulse) this.key.setIntensity(this.keyBase * (1 + this.keyPulse.amount * Math.sin((now / this.keyPulse.ms) * Math.PI * 2)));
    if (!this.moments.length) return;
    let amb = this.ambient;
    this.moments = this.moments.filter((m) => {
      const k = (now - m.t0) / m.ms;
      if (k >= 1) return false;
      amb = m.fn(Math.max(0, k));
      return true;
    });
    this.scene.lights.setAmbientColor(amb);
  }
}
