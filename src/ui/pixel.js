import { E32 } from '../data/palette.js';

// Pixel-exact drawing helpers for Phaser Graphics (no anti-aliased shapes).

// Stone UI panel: dark stone fill, 1px light top edge, 1px dark bottom edge,
// small rivets in the corners and a few speckles on big panels. All Endesga 32.
export function panel(g, x, y, w, h, { fill = E32.night, hi = E32.slate, lo = E32.ink, outline = E32.ink, rivets = true } = {}) {
  g.fillStyle(outline).fillRect(x, y, w, h);
  g.fillStyle(fill).fillRect(x + 1, y + 1, w - 2, h - 2);
  g.fillStyle(hi).fillRect(x + 1, y + 1, w - 2, 1);
  g.fillStyle(lo).fillRect(x + 1, y + h - 2, w - 2, 1);
  if (w >= 60 && h >= 40) { // stone speckle
    g.fillStyle(E32.dusk);
    for (let i = 0; i < (w * h) / 180; i++) g.fillRect(x + 4 + ((i * 37) % (w - 8)), y + 4 + ((i * 53) % (h - 8)), 1 + (i % 2), 1);
  }
  if (rivets && w >= 16 && h >= 14) {
    for (const [rx, ry] of [[x + 2, y + 3], [x + w - 3, y + 3], [x + 2, y + h - 4], [x + w - 3, y + h - 4]]) {
      g.fillStyle(E32.steel).fillRect(rx, ry, 1, 1);
      g.fillStyle(E32.ink).fillRect(rx, ry + 1, 1, 1);
    }
  }
  return g;
}

// Midpoint circle outline.
export function pixelCircle(g, cx, cy, r, color, alpha = 1) {
  cx = Math.round(cx); cy = Math.round(cy); r = Math.round(r);
  g.fillStyle(color, alpha);
  const plot = (a, b) => g.fillRect(cx + a, cy + b, 1, 1);
  let x = r, y = 0, err = 1 - r;
  while (x >= y) {
    plot(x, y); plot(y, x); plot(-y, x); plot(-x, y);
    plot(-x, -y); plot(-y, -x); plot(y, -x); plot(x, -y);
    y++;
    if (err < 0) err += 2 * y + 1;
    else { x--; err += 2 * (y - x) + 1; }
  }
}

// Bresenham line. dash > 1 draws every dash-th pixel (dotted).
export function pixelLine(g, x0, y0, x1, y1, color, alpha = 1, dash = 1) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  g.fillStyle(color, alpha);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (let i = 0; ; i++) {
    if (i % dash === 0) g.fillRect(x0, y0, 1, 1);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}
