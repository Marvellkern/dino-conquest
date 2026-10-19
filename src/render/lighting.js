import { W, H } from '../config.js';
import { TIERS } from '../data/quality.js';
import { LIGHTING } from '../data/lighting.js';
import { render } from './quality.js';
import { ensureNormalMap } from './normals.js';

// A scene's real (Light2D) lights: the zone's ambient + key light, plus short bursts
// (hit sparks). Only on tiers with light2d; otherwise every method is a no-op, so
// callers never need to check the tier.
//   lit(rig)       light a rig's parts (normal maps are built on first use)
//   burst(x, y, o) a light that flares and fades over o.ms (real time: it plays
//                  through hitstop). Over the tier's light cap, the oldest burst goes.
export class SceneLights {
  constructor(scene, zone) {
    const tier = TIERS[render.tier];
    this.scene = scene;
    this.on = !!tier.light2d && scene.renderer.type === Phaser.WEBGL && scene.renderer.pipelines.has('Lit');
    this.bursts = [];
    if (!this.on) return;
    this.max = tier.lights;
    const L = LIGHTING[zone] ?? LIGHTING.jungle, k = L.key;
    scene.lights.enable().setAmbientColor(L.ambient);
    this.key = scene.lights.addLight(Math.round(W * k.x), Math.round(H * k.y), k.radius, k.color, k.intensity);
    this.count();
    this.tick = () => this.update();
    scene.events.on('update', this.tick);
    scene.events.once('shutdown', () => { scene.events.off('update', this.tick); render.lights = 0; });
  }

  count() { render.lights = (this.key ? 1 : 0) + this.bursts.length; }

  lit(rig) {
    if (!this.on || !rig) return rig;
    rig.setLit('Lit', (key) => ensureNormalMap(this.scene, key, rig.normalSource?.(key) ?? key));
    return rig;
  }

  burst(x, y, { color, radius, intensity, ms }) {
    if (!this.on) return;
    while (this.bursts.length && this.bursts.length + 1 >= this.max) this.end(this.bursts[0]); // the key light keeps its slot
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
