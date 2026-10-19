// Graphics quality tiers (lighting brief, v2.3). Low is the original look.
//   rs       render scale: the canvas is W*rs x H*rs and cameras zoom by rs, so the
//            world stays 320x180 (180x320 portrait) and pixels stay crisp
//   lights   max real (Light2D) lights at once
//   light2d  normal-mapped battle sprites
//   baked    blurred backdrop layers, god rays, fog, soft directional shadows
//   bloom    bloom buffer size (fraction of the canvas; 0 = off)
//   grade    color grade: 'cheap' (tint only) | 'full' (grade + vignette)
//   glow     fireflies / embers as additive glow sprites
// The lighting steps after step 1 read these; step 1 only uses rs.
export const TIERS = {
  low:    { rs: 1, lights: 0, light2d: false, baked: false, bloom: 0, grade: 'cheap', glow: false },
  medium: { rs: 2, lights: 4, light2d: true, baked: true, bloom: 0.25, grade: 'full', glow: true },
  high:   { rs: 4, lights: 8, light2d: true, baked: true, bloom: 0.5, grade: 'full', glow: true }
};
export const TIER_ORDER = ['low', 'medium', 'high'];
export const GFX_SETTINGS = ['auto', ...TIER_ORDER]; // the Settings choice

// Auto: start at Medium on phones and High on desktops, then measure the first
// battle: if the average over AUTO_PROBE_MS is under AUTO_MIN_FPS, drop a tier
// (remembered in the meta save). Auto never raises the tier by itself.
export const AUTO_PROBE_MS = 3000;
export const AUTO_MIN_FPS = 50;
