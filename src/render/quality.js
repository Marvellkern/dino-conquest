import { W, H } from '../config.js';
import { TIERS, TIER_ORDER, AUTO_PROBE_MS, AUTO_MIN_FPS } from '../data/quality.js';
import { meta, persist } from '../systems/meta.js';
import { isPhone } from '../systems/screen.js';

// The graphics tier and render scale (data/quality.js).
// Every scene's create() calls syncLayout(), which calls applyRender(): if the tier's
// render scale changed, the canvas is resized now (between scenes, never mid-fight),
// then the scene's camera zooms by it with its origin at the top-left, so scroll stays
// "top-left of the view in world units" and pinned (scroll factor 0) objects line up.

export const render = { rs: 1, tier: 'low', lights: 0 }; // lights: active real lights (FPS overlay)

const webgl = (game) => game.renderer?.type === Phaser.WEBGL;
const startTier = () => (isPhone() || Math.min(screen.width, screen.height) < 600 ? 'medium' : 'high');

// The tier the game should use now.
export function wantedTier(game) {
  if (!webgl(game)) return 'low'; // Canvas renderer: no lighting, original look
  const s = meta.settings.gfx ?? 'auto';
  if (s !== 'auto') return TIERS[s] ? s : 'low';
  return TIERS[meta.settings.gfxAuto] ? meta.settings.gfxAuto : startTier();
}

// Never render at more pixels than the screen shows: rs is capped by the device-pixel zoom.
const wantedRs = (game, tier) => Math.max(1, Math.min(TIERS[tier].rs, Math.floor(game.registry.get('zoom') ?? 1)));

export function applyRender(scene) {
  const game = scene.game, tier = wantedTier(game), rs = wantedRs(game, tier);
  render.tier = tier;
  if (rs !== render.rs || game.scale.width !== W * rs || game.scale.height !== H * rs) {
    render.rs = rs;
    game.scale.setGameSize(W * rs, H * rs);
    game.events.emit('rescale');
  }
  scene.cameras.main.setOrigin(0, 0).setZoom(render.rs);
}

// Auto: measure the first battle of the session; under AUTO_MIN_FPS, drop one tier for
// next time (the next scene picks it up). Battle calls this from create().
let probed = false;
export function autoProbe(scene) {
  if (probed || (meta.settings.gfx ?? 'auto') !== 'auto' || !webgl(scene.game)) return;
  probed = true;
  let ms = 0, frames = 0, skip = 3; // the first frames after a scene start are uneven
  const tick = (_, dt) => {
    if (skip-- > 0) return;
    ms += dt;
    frames++;
    if (ms < AUTO_PROBE_MS) return;
    scene.events.off('update', tick);
    const fps = (frames * 1000) / ms, i = TIER_ORDER.indexOf(render.tier);
    if (import.meta.env.DEV) console.info(`[gfx] auto probe ${fps.toFixed(1)} fps at ${render.tier}`);
    if (fps < AUTO_MIN_FPS && i > 0) {
      meta.settings.gfxAuto = TIER_ORDER[i - 1];
      persist();
    }
  };
  scene.events.on('update', tick);
  scene.events.once('shutdown', () => scene.events.off('update', tick));
}

// Settings label: "AUTO (MEDIUM)", "HIGH"...
export const gfxLabel = (game) => {
  const s = meta.settings.gfx ?? 'auto';
  return s === 'auto' ? `AUTO (${wantedTier(game).toUpperCase()})` : s.toUpperCase();
};
