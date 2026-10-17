import { PAL } from '../data/palette.js';

// Evolution / boss skins, derived from the base grids in code:
//   - recolor: hue/saturation/lightness shift of every body color
//   - silhouette: bone-white dorsal spikes along the back half

const KEEP = new Set(['O', 'W', 'E', 'S']); // outline, teeth, eyes, sparks stay put

function hexToHsl(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const to = (v) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

// Per evolution stage: hue shift (deg), saturation and lightness multipliers.
export const EVO_SHIFT = [null, { h: 35, s: 1.1, l: 0.95 }, { h: -45, s: 1.25, l: 0.85 }];
export const EVO_SPIKE_EVERY = [0, 3, 2];

export function shiftedColor({ h, s, l }) {
  const cache = {};
  return (ch) => {
    if (KEEP.has(ch)) return PAL[ch];
    if (!(ch in cache)) {
      const [hh, ss, ll] = hexToHsl(PAL[ch]);
      cache[ch] = hslToHex(hh + h, Math.min(1, ss * s), Math.min(1, ll * l));
    }
    return cache[ch];
  };
}

// Every skin's grid, filled in by Boot, so other looks (fossils) can be drawn later.
export const SKIN_GRIDS = {};

// Fossil: bone-colored cast with dark sockets.
const SHADE_KEYS = new Set(['D', 'B', 'K', 'H', 'U', 'Z', 'M', 'Q', 'q', 'k', 't', 'g']);
export const fossilColor = (ch) =>
  ch === 'O' || ch === 'E' ? '#2e2418' : ch === 'W' ? '#f2ead6' : SHADE_KEYS.has(ch) ? '#a8977a' : '#d6c9a8';

// Alpha Rex: blood-red hide, yellow eyes.
export const ALPHA = { G: '#8c2c24', D: '#58181a', L: '#c89070', M: '#2a0808', E: '#ffe040' };
export const alphaColor = (ch) => ALPHA[ch] ?? PAL[ch];

// Adds 2px spikes (white body, outline tip, outlined sides) on top of the
// silhouette, every `every` columns across the back half of the sprite.
export function spikedGrid(grid, every) {
  const w = grid[0].length;
  const rows = grid.map((r) => [...r]);
  for (let x = Math.round(w * 0.2); x < Math.round(w * 0.5); x += every) {
    const top = rows.findIndex((r) => r[x] !== '.');
    if (top < 2) continue;
    rows[top - 1][x] = 'W';
    rows[top - 2][x] = 'O';
    for (const sx of [x - 1, x + 1]) if (rows[top - 1][sx] === '.') rows[top - 1][sx] = 'O';
  }
  return rows.map((r) => r.join(''));
}
