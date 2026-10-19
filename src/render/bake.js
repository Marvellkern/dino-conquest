import { LAND } from '../config.js';
import { PAD, LW } from '../ui/artKit.js';
import { render } from './quality.js';

const { H } = LAND;

// Baked backdrop layers (lighting brief §6), Medium / High only. A layer is drawn by its
// usual zone-art function at 1x, scaled up to the render scale (nearest, so its pixels
// stay square), color graded, blurred for depth of field, and kept as a smooth (linear)
// texture. Built once per zone and render scale; switching zones frees the old one.
//   cfg: { grade: [r, g, b] multipliers, fog: [color, amount], dark: extra multiplier,
//          blur: radius in world px, sharpBelow: rows from here down stay sharp (ground),
//          paint(ctx, w, h, rs): smooth extras drawn after the grade (moon glow, haze) }
let zoneBaked = null;
const keysOf = new Map(); // zone -> texture keys

export function bakedLayer(scene, zone, name, draw, cfg = {}) {
  const rs = render.rs, key = `bake_${zone}_${name}_${rs}`;
  use(scene, zone);
  if (!scene.textures.exists(key)) {
    const g = scene.make.graphics({ add: false });
    draw(g);
    const tmp = `${key}_src`;
    g.generateTexture(tmp, LW, H);
    g.destroy();
    const src = scene.textures.get(tmp).getSourceImage();
    const canvas = document.createElement('canvas');
    canvas.width = LW * rs; canvas.height = H * rs;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(src, 0, 0, LW * rs, H * rs);
    scene.textures.remove(tmp);
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    grade(img.data, cfg);
    if (cfg.blur) blur(img.data, canvas.width, canvas.height, Math.round(cfg.blur * rs), 0, cfg.sharpBelow != null ? cfg.sharpBelow * rs : canvas.height);
    ctx.putImageData(img, 0, 0);
    cfg.paint?.(ctx, canvas.width, canvas.height, rs);
    scene.textures.addCanvas(key, canvas).setFilter(Phaser.Textures.FilterMode.LINEAR);
    keysOf.get(zone).add(key);
  }
  return scene.add.image(-PAD, 0, key).setOrigin(0).setScale(1 / rs);
}

// A smooth texture painted straight onto a canvas at render scale (god rays, fog, glows).
export function bakedCanvas(scene, zone, name, w, h, paint) {
  const rs = render.rs, key = `bake_${zone}_${name}_${rs}`;
  use(scene, zone);
  if (!scene.textures.exists(key)) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(w * rs); canvas.height = Math.ceil(h * rs);
    paint(canvas.getContext('2d'), canvas.width, canvas.height, rs);
    scene.textures.addCanvas(key, canvas).setFilter(Phaser.Textures.FilterMode.LINEAR);
    keysOf.get(zone).add(key);
  }
  return key;
}

// zone 'shared': textures every zone uses (glows, shadows), never freed.
function use(scene, zone) {
  if (zone !== 'shared' && zoneBaked !== zone) {
    for (const [z, keys] of keysOf) {
      if (z === 'shared') continue;
      for (const k of keys) if (scene.textures.exists(k)) scene.textures.remove(k);
      keysOf.delete(z);
    }
    zoneBaked = zone;
  }
  if (!keysOf.has(zone)) keysOf.set(zone, new Set());
}

function grade(d, { grade: m = [1, 1, 1], fog = null, dark = 1 }) {
  const [fr, fg, fb] = fog ? [(fog[0] >> 16) & 255, (fog[0] >> 8) & 255, fog[0] & 255] : [0, 0, 0], fa = fog ? fog[1] : 0;
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    d[i] = (d[i] * m[0] * (1 - fa) + fr * fa) * dark;
    d[i + 1] = (d[i + 1] * m[1] * (1 - fa) + fg * fa) * dark;
    d[i + 2] = (d[i + 2] * m[2] * (1 - fa) + fb * fa) * dark;
  }
}

// Three box passes (close to a gaussian), premultiplied so transparent edges don't go dark.
// Only rows y0..y1 are blurred (the ground line of a mid layer stays sharp).
function blur(d, w, h, r, y0, y1) {
  if (r < 1) return;
  for (let i = 0; i < d.length; i += 4) { const a = d[i + 3] / 255; d[i] *= a; d[i + 1] *= a; d[i + 2] *= a; }
  const rowEnd = Math.min(h, y1), tmp = new Float32Array(Math.max(w, h) * 4);
  for (let pass = 0; pass < 3; pass++) {
    for (let y = y0; y < rowEnd; y++) boxLine(d, (y * w) * 4, 4, w, r, tmp);
    for (let x = 0; x < w; x++) boxLine(d, (y0 * w + x) * 4, w * 4, rowEnd - y0, r, tmp);
  }
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3] / 255;
    if (a > 0) { d[i] /= a; d[i + 1] /= a; d[i + 2] /= a; }
  }
}

function boxLine(d, start, step, n, r, tmp) {
  const div = 2 * r + 1;
  for (let c = 0; c < 4; c++) {
    let sum = 0;
    for (let k = -r; k <= r; k++) sum += d[start + Math.min(n - 1, Math.max(0, k)) * step + c];
    for (let i = 0; i < n; i++) {
      tmp[i * 4 + c] = sum / div;
      sum += d[start + Math.min(n - 1, i + r + 1) * step + c] - d[start + Math.max(0, i - r) * step + c];
    }
  }
  for (let i = 0; i < n; i++) for (let c = 0; c < 4; c++) d[start + i * step + c] = tmp[i * 4 + c];
}
