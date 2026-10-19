// Auto-generated normal maps for sprite textures (lighting brief §4), so Light2D sees
// each dino as slightly rounded instead of a flat sticker.
//   1. distance from each opaque pixel to the nearest transparent one (chamfer 1 / 1.41),
//   2. capped at CAP pixels and shaped into a dome: h = sqrt(1 - (1 - d)^2),
//   3. lightly blurred, then normals from the height gradient, encoded like a standard
//      (OpenGL, green = up) normal map.
// The map has the texture's own size (Phaser needs that), one normal per sprite pixel,
// which keeps the lighting pixel-crisp; the light falloff itself is smooth per screen pixel.
const CAP = 2.5, STRENGTH = 2.2, BIG = 1e9;

export function normalCanvas(src, w = src.width, h = src.height) {
  const ctx = src.getContext ? src.getContext('2d') : null;
  const data = ctx ? ctx.getImageData(0, 0, w, h).data : readImage(src, w, h);
  const n = w * h, dist = new Float32Array(n), height = new Float32Array(n);
  for (let i = 0; i < n; i++) dist[i] = data[i * 4 + 3] > 0 ? BIG : 0;
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : dist[y * w + x]); // outside counts as empty
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { // forward pass
    const i = y * w + x;
    if (!dist[i]) continue;
    dist[i] = Math.min(dist[i], at(x - 1, y) + 1, at(x, y - 1) + 1, at(x - 1, y - 1) + 1.41, at(x + 1, y - 1) + 1.41);
  }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) { // backward pass
    const i = y * w + x;
    if (!dist[i]) continue;
    dist[i] = Math.min(dist[i], at(x + 1, y) + 1, at(x, y + 1) + 1, at(x + 1, y + 1) + 1.41, at(x - 1, y + 1) + 1.41);
  }
  for (let i = 0; i < n; i++) {
    if (!dist[i]) continue;
    const d = Math.min(1, (dist[i] - 0.5) / CAP);
    height[i] = Math.sqrt(1 - (1 - d) * (1 - d));
  }
  const blurred = new Float32Array(n), hv = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : height[y * w + x]);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!dist[y * w + x]) continue;
    let s = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s += hv(x + dx, y + dy) * (dx || dy ? 1 : 4);
    blurred[y * w + x] = s / 12;
  }
  const bv = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : blurred[y * w + x]);
  const out = document.createElement('canvas');
  out.width = w; out.height = h;
  const octx = out.getContext('2d'), img = octx.createImageData(w, h), px = img.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    let nx = 0, ny = 0, nz = 1;
    if (dist[y * w + x]) {
      nx = (bv(x - 1, y) - bv(x + 1, y)) * STRENGTH; // left edge: normal points left
      ny = (bv(x, y + 1) - bv(x, y - 1)) * STRENGTH; // top edge: normal points up (green = up)
      const len = Math.hypot(nx, ny, nz);
      nx /= len; ny /= len; nz /= len;
    }
    px[i] = Math.round((nx * 0.5 + 0.5) * 255);
    px[i + 1] = Math.round((ny * 0.5 + 0.5) * 255);
    px[i + 2] = Math.round((nz * 0.5 + 0.5) * 255);
    px[i + 3] = 255;
  }
  octx.putImageData(img, 0, 0);
  return out;
}

function readImage(img, w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, w, h).data;
}

// Attach a normal map to texture `key`, built from texture `from` (the T-rex parts all use
// the whole rex's map, so the seams between parts don't show). Built once per key.
const built = new Map(); // from-key -> canvas
export function ensureNormalMap(scene, key, from = key) {
  const tex = scene.textures.get(key);
  if (!tex || tex.key === '__MISSING' || tex.__normal) return;
  let canvas = built.get(from);
  if (!canvas) {
    const src = scene.textures.get(from).getSourceImage();
    canvas = normalCanvas(src);
    built.set(from, canvas);
  }
  tex.setDataSource(canvas);
  tex.__normal = true;
}

export const normalMapsBuilt = () => built.size;
