import { W, GROUND_Y } from '../config.js';
import { TIERS } from '../data/quality.js';
import { LIGHTING } from '../data/lighting.js';
import { render } from './quality.js';
import { ensureNormalMap } from './normals.js';
import { shadowTexture } from './atmos.js';

// A scene's real (Light2D) lights: the zone's ambient + key light, plus short bursts
// (hit sparks). Only on tiers with light2d; otherwise every method is a no-op, so
// callers never need to check the tier.
//   lit(rig)       light a rig's parts (normal maps are built on first use)
//   burst(x, y, o) a light that flares and fades over o.ms (real time: it plays
//                  through hitstop). Over the tier's light cap, the oldest burst goes.
//   steady(r, c, i) a long-lived light the caller moves (fireflies); only while at
//                  least 4 slots stay free for bursts (so High only), else null
export class SceneLights {
  constructor(scene, zone) {
    const tier = TIERS[render.tier];
    this.scene = scene;
    this.on = !!tier.light2d && scene.renderer.type === Phaser.WEBGL && scene.renderer.pipelines.has('Lit');
    this.bursts = [];
    this.steadies = [];
    if (!this.on) return;
    this.zone = zone;
    this.max = tier.lights;
    const L = LIGHTING[zone] ?? LIGHTING.jungle, k = L.key;
    scene.lights.enable().setAmbientColor(L.ambient);
    const x = k.side === 'right' ? W + k.dx : k.side === 'left' ? -k.dx : W / 2 + k.dx;
    this.key = scene.lights.addLight(Math.round(x), GROUND_Y - k.dy, k.radius, k.color, k.intensity);
    this.count();
    this.tick = () => this.update();
    scene.events.on('update', this.tick);
    scene.events.once('shutdown', () => { scene.events.off('update', this.tick); render.lights = 0; });
  }

  count() { render.lights = (this.key ? 1 : 0) + this.steadies.length + this.bursts.length; }

  steady(radius, color, intensity) {
    if (!this.on || this.max - 1 - this.steadies.length <= 4) return null;
    const light = this.scene.lights.addLight(0, 0, radius, color, intensity);
    this.steadies.push(light);
    this.count();
    return light;
  }

  lit(rig) {
    if (!this.on || !rig) return rig;
    rig.setLit('Lit', (key) => ensureNormalMap(this.scene, key, rig.normalSource?.(key) ?? key));
    const sh = LIGHTING[this.zone]?.bake?.shadow; // baked tiers: a soft shadow cast away from the key light
    if (sh && TIERS[render.tier].baked) rig.softShadow(shadowTexture(this.scene), sh);
    return rig;
  }

  burst(x, y, { color, radius, intensity, ms }) {
    if (!this.on) return;
    while (this.bursts.length && 1 + this.steadies.length + this.bursts.length >= this.max) this.end(this.bursts[0]); // key + steady lights keep their slots
    const light = this.scene.lights.addLight(x, y, radius * 0.7, color, intensity);
    this.bursts.push({ light, t0: Date.now(), ms, radius, intensity });
    this.count();
  }

  end(b) {
    this.scene.lights.removeLight(b.light);
    this.bursts.splice(this.bursts.indexOf(b), 1);
    this.count();
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
  }
}
