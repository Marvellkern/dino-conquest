import { LAND } from '../config.js';
import { PAD, rnd } from '../ui/artKit.js';
import { render } from './quality.js';
import { godRays, fogBand, glowTexture } from './atmos.js';
import { MOMENTS } from '../data/lighting.js';

const { W, H, GROUND_Y } = LAND; // the zone art's own (landscape) units

// The baked-tier extras of a zone (data/lighting.js bake): zone emitters (real lights with a
// glow on the ground under them), drifting glow sprites, fog bands, god rays and lightning.
// Called from zoneBackdrop for every zone but the Jungle, which has its own night pass.
// `add` registers a per-frame function; `front` takes what draws over the fighters;
// `offset` turns art units into world positions (portrait moves the art); `lights` is the
// battle's SceneLights (or undefined in scenes without lighting).
export function zoneExtras(scene, zone, add, { bake, front, offset, lights }) {
  const glow = glowTexture(scene), ADD = Phaser.BlendModes.ADD;
  const img = (x, y, key) => scene.add.image(x, y, key).setBlendMode(ADD);

  if (bake.rays) {
    const rays = scene.add.image(-PAD, 0, godRays(scene, zone, bake.rays)).setOrigin(0).setScale(1 / render.rs).setDepth(2.5).setBlendMode(ADD);
    scene.tweens.add({ targets: rays, alpha: { from: bake.rays.alpha * 0.6, to: bake.rays.alpha }, duration: 3600, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }

  for (const [i, f] of [bake.fog ?? []].flat().entries()) {
    const key = fogBand(scene, zone, f, `fog${i}`);
    const pair = [0, W * 2].map((x) => scene.add.image(x, f.y, key).setOrigin(0).setScale(1 / render.rs).setDepth(2.6).setAlpha(f.alpha));
    add((t) => { const x = -((t / (f.speed ?? 90)) % (W * 2)); pair[0].x = Math.round(x); pair[1].x = Math.round(x + W * 2); });
  }

  for (const [i, e] of (bake.emitters ?? []).entries()) {
    const pool = img(e.x, GROUND_Y - 1, glow).setTint(e.color).setDisplaySize(e.radius * 1.1, e.radius * 0.22).setAlpha(0.5).setDepth(2.4);
    const halo = img(e.x, e.y, glow).setTint(e.color).setDisplaySize(18, 18).setAlpha(0.7).setDepth(2.45);
    if (bake.fungi) fungus(scene, e.x, e.y, e.color);
    const light = lights?.emitter(e.x + offset.x, e.y + offset.y, e.radius, e.color, e.intensity) ?? null;
    let wob = 1;
    add((t) => {
      const k = e.pulse ? 1 + e.pulse * Math.sin(t / 900 + i * 1.7) : (wob = wob * 0.8 + (1 + (Math.random() - 0.5) * 2 * e.flicker) * 0.2);
      light?.setIntensity(e.intensity * k);
      halo.setAlpha(0.55 * k);
      pool.setAlpha(0.45 * k);
    });
  }

  if (bake.glows) for (let i = 0; i < bake.glows.count; i++) add(glowSprite(scene, img(0, 0, glow), bake.glows, i));

  if (bake.lightning && front) lightning(scene, front, lights, bake.lightning);
}

// A glowing fungus cap on a root: a few pixels the emitter sits on.
function fungus(scene, x, y, color) {
  for (const [dx, dy, w] of [[-2, 0, 3], [1, -1, 3], [-1, 2, 2]]) {
    scene.add.rectangle(x + dx, y + dy, w, 1, color).setOrigin(0).setDepth(2.46);
    scene.add.rectangle(x + dx, y + dy + 1, 1, 2, 0x5a6988).setOrigin(0).setDepth(2.46); // the stalk
  }
}

// One glow sprite: rise (embers), drift (spores) or twinkle (crystal motes).
function glowSprite(scene, sprite, g, i) {
  const [x0, y0, x1, y1] = g.area, w = x1 - x0, h = y1 - y0;
  const p = { x: x0 + rnd(i * 3 + 1, w), y: y0 + rnd(i * 7 + 2, h), ph: rnd(i + 5, 6), v: 6 + rnd(i + 9, 10) };
  sprite.setTint(g.color).setDisplaySize(g.size, g.size).setDepth(3);
  return (t, dt) => {
    if (g.kind === 'rise') {
      p.y -= (p.v * dt) / 1000;
      if (p.y < y0) { p.y = y1; p.x = x0 + rnd(t + i * 13, w); }
      sprite.setPosition(p.x + Math.sin(p.y / 9 + p.ph) * 3, p.y).setAlpha(0.35 + 0.5 * Math.min(1, (p.y - y0) / (h * 0.5)));
    } else if (g.kind === 'drift') {
      sprite.setPosition(p.x + Math.sin(t / 2100 + p.ph) * 14, p.y + Math.sin(t / 1300 + p.ph * 2) * 6).setAlpha(0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t / 700 + p.ph)));
    } else {
      sprite.setPosition(p.x, p.y).setAlpha(Math.max(0, Math.sin(t / 500 + p.ph * 4)) * 0.8);
    }
  };
}

// Every 10-15s a flash lights the whole scene for a couple of frames, then fades. Skipped
// during a QTE (scene.qteActive), so it never gets in the way of the timing.
function lightning(scene, front, lights, { every: [a, b] }) {
  const flash = scene.add.rectangle(-20, -20, W + 40, H + 40, 0xe8eeff, 0).setOrigin(0).setBlendMode(Phaser.BlendModes.ADD);
  front.add(flash);
  const next = () => scene.time.delayedCall(a + Math.random() * (b - a), strike);
  const strike = () => {
    if (!flash.scene) return;
    if (scene.qteActive) { scene.time.delayedCall(1000, strike); return; }
    lights?.lightning();
    flash.setAlpha(MOMENTS.lightning.flash);
    scene.tweens.add({ targets: flash, alpha: 0, duration: 140, ease: 'Quad.Out' });
    next();
  };
  next();
}
