// Pixel-exact drawing helpers for Phaser Graphics (no anti-aliased shapes).

// UI panel: 1px outline + 1px inner highlight on top/left.
export function panel(g, x, y, w, h, { fill = 0x2e333d, hi = 0x4a5161, outline = 0x0c0e12 } = {}) {
  g.fillStyle(outline).fillRect(x, y, w, h);
  g.fillStyle(fill).fillRect(x + 1, y + 1, w - 2, h - 2);
  g.fillStyle(hi).fillRect(x + 1, y + 1, w - 2, 1).fillRect(x + 1, y + 1, 1, h - 2);
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
