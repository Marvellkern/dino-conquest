import { LAND } from '../config.js';

const { W, H } = LAND; // backdrops are drawn in landscape units

// Drawing helpers shared by the zone backdrops (ui/zoneArt.js, ui/zoneArt2.js).
export const PAD = 8, LW = W + PAD * 2;
export const rnd = (i, n) => ((i * 9301 + 49297) % 233280) / 233280 * n; // stable pseudo-random

// Checkerboard dither between two colors (a gradient step without new colors).
export function dither(g, x, y, w, h, a, b) {
  g.fillStyle(a).fillRect(x, y, w, h);
  g.fillStyle(b);
  for (let yy = y; yy < y + h; yy++) for (let xx = x + ((yy + x) % 2); xx < x + w; xx += 2) g.fillRect(xx, yy, 1, 1);
}

// Vertical bands with a 2px dithered seam between each pair.
export function bands(g, colors, y0, y1) {
  const bh = (y1 - y0) / colors.length;
  colors.forEach((c, i) => {
    const y = Math.round(y0 + i * bh);
    g.fillStyle(c).fillRect(0, y, LW, Math.ceil(bh));
    if (i > 0) dither(g, 0, y - 1, LW, 2, colors[i - 1], c);
  });
}

// Stepped filled disc.
export function disc(g, cx, cy, r, color) {
  g.fillStyle(color);
  for (let dy = -r; dy <= r; dy++) {
    const w = Math.round(Math.sqrt(r * r - dy * dy));
    g.fillRect(cx - w, cy + dy, w * 2 + 1, 1);
  }
}

export function layer(scene, key, depth, draw) {
  if (!scene.textures.exists(key)) {
    const g = scene.make.graphics({ add: false });
    draw(g);
    g.generateTexture(key, LW, H);
    g.destroy();
  }
  return scene.add.image(-PAD, 0, key).setOrigin(0).setDepth(depth);
}
