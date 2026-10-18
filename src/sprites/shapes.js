// A tiny shape builder for character grids: fill ellipses, thick lines and
// triangles with palette keys, then shade and outline automatically. Used for
// the v2 species (sprites/grids2.js); the result is a normal grid of strings.
// margin: empty pixels added around the drawing area (coordinates stay the same), so
// shapes that touch the edge still get their outline.
export function shapeGrid(w0, h0, draw, { margin = 0 } = {}) {
  const m = margin, w = w0 + 2 * m, h = h0 + 2 * m;
  const rows = Array.from({ length: h }, () => Array(w).fill('.'));
  const put = (x, y, k) => { x = Math.round(x); y = Math.round(y); if (rows[y]?.[x] !== undefined) rows[y][x] = k; };
  const set = (x, y, k) => put(x + m, y + m, k);
  const api = {
    px: set,
    ellipse(cx, cy, rx, ry, k, { top = false, bottom = false } = {}) {
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
        if ((top && y > cy) || (bottom && y < cy)) continue;
        for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
          const dx = (x - cx) / (rx + 0.35), dy = (y - cy) / (ry + 0.35);
          if (dx * dx + dy * dy <= 1) set(x, y, k);
        }
      }
    },
    rect(x, y, rw, rh, k) { for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) set(x + i, y + j, k); },
    // Line of thickness t from (x0, y0) to (x1, y1); t1 tapers the far end.
    line(x0, y0, x1, y1, k, t = 1, t1 = t) {
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
      for (let i = 0; i <= n; i++) {
        const f = i / n, x = x0 + (x1 - x0) * f, y = y0 + (y1 - y0) * f, r = (t + (t1 - t) * f) / 2;
        for (let dy = -r + 0.5; dy <= r - 0.5 + 0.01; dy++) for (let dx = -r + 0.5; dx <= r - 0.5 + 0.01; dx++) set(x + dx, y + dy, k);
        if (r < 1) set(x, y, k);
      }
    },
    tri(ax, ay, bx, by, cx, cy, k) {
      const minX = Math.floor(Math.min(ax, bx, cx)), maxX = Math.ceil(Math.max(ax, bx, cx));
      const minY = Math.floor(Math.min(ay, by, cy)), maxY = Math.ceil(Math.max(ay, by, cy));
      const s = (px, py, qx, qy, rx, ry) => (px - rx) * (qy - ry) - (qx - rx) * (py - ry);
      for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
        const d1 = s(x, y, ax, ay, bx, by), d2 = s(x, y, bx, by, cx, cy), d3 = s(x, y, cx, cy, ax, ay);
        if (!((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0))) set(x, y, k);
      }
    },
    // Lowest `depth` filled pixels of each column of key `k` become `to` (belly / shade).
    shadeBottom(k, to, depth = 2, x0 = 0, x1 = w0 - 1) {
      for (let x = x0 + m; x <= x1 + m; x++) {
        let n = 0;
        for (let y = h - 1; y >= 0 && n < depth; y--) if (rows[y][x] === k) { rows[y][x] = to; n++; } else if (n) break;
      }
    },
    // Top `depth` pixels of each column of key `k` become `to` (highlight / shade line).
    shadeTop(k, to, depth = 1, x0 = 0, x1 = w0 - 1) {
      for (let x = x0 + m; x <= x1 + m; x++) {
        let n = 0;
        for (let y = 0; y < h && n < depth; y++) if (rows[y][x] === k) { rows[y][x] = to; n++; } else if (n) break;
      }
    }
  };
  draw(api);
  // Outline: every empty pixel touching a filled one (4-neighbour) becomes O.
  const filled = rows.map((r) => r.map((c) => c !== '.' && c !== 'O'));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (rows[y][x] !== '.') continue;
    if (filled[y - 1]?.[x] || filled[y + 1]?.[x] || filled[y][x - 1] || filled[y][x + 1]) rows[y][x] = 'O';
  }
  // Trim empty rows top and bottom so the feet sit on the last row.
  const out = rows.map((r) => r.join(''));
  while (out.length && !/[^.]/.test(out[0])) out.shift();
  while (out.length && !/[^.]/.test(out[out.length - 1])) out.pop();
  return out;
}
