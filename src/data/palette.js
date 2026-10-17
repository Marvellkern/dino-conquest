// All sprite art is locked to the Endesga 32 palette. ENDESGA32 lists it;
// toEndesga() snaps any color (evolution hue shifts, skins) to its nearest entry,
// and renderSprite.js runs every pixel through it.
export const ENDESGA32 = [
  '#be4a2f', '#d77643', '#ead4aa', '#e4a672', '#b86f50', '#733e39', '#3e2731', '#a22633',
  '#e43b44', '#f77622', '#feae34', '#fee761', '#63c74d', '#3e8948', '#265c42', '#193c3e',
  '#124e89', '#0099db', '#2ce8f5', '#ffffff', '#c0cbdc', '#8b9bb4', '#5a6988', '#3a4466',
  '#262b44', '#181425', '#ff0044', '#68386c', '#b55088', '#f6757a', '#e8b796', '#c28569'
];

// Named entries for code-drawn backgrounds and UI (0xRRGGBB numbers).
export const E32 = Object.fromEntries([
  'rust', 'orange', 'sand', 'tan', 'clay', 'brown', 'darkBrown', 'crimson',
  'red', 'amber', 'gold', 'yellow', 'green', 'forest', 'pine', 'deepTeal',
  'navy', 'blue', 'cyan', 'white', 'silver', 'steel', 'slate', 'dusk',
  'night', 'ink', 'hotPink', 'plum', 'mauve', 'salmon', 'peach', 'leather'
].map((name, i) => [name, parseInt(ENDESGA32[i].slice(1), 16)]));

const rgb = (h) => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const LIST = ENDESGA32.map((h) => [h, rgb(h)]);
const cache = new Map();

// Nearest palette entry (red-mean weighted RGB distance).
export function toEndesga(hex) {
  if (!hex) return hex;
  let out = cache.get(hex);
  if (out) return out;
  const [r, g, b] = rgb(hex);
  let best = Infinity;
  for (const [h, [r2, g2, b2]] of LIST) {
    const rm = (r + r2) / 2;
    const d = (2 + rm / 256) * (r - r2) ** 2 + 4 * (g - g2) ** 2 + (2 + (255 - rm) / 256) * (b - b2) ** 2;
    if (d < best) { best = d; out = h; }
  }
  cache.set(hex, out);
  return out;
}

// Single-character palette keys used by every sprite grid, picked from Endesga 32.
// '.' is transparent. Add new keys per species (3–4 each).
export const PAL = {
  O: '#181425', // outline
  G: '#3e8948', // rex green
  D: '#265c42', // rex dark green (shade)
  L: '#ead4aa', // rex belly
  W: '#ffffff', // teeth / claws
  E: '#e43b44', // eye
  M: '#a22633', // mouth interior
  R: '#d77643', // raptor orange
  B: '#be4a2f', // raptor dark
  K: '#733e39', // raptor stripes
  C: '#e8b796', // raptor belly
  S: '#fee761', // impact spark
  Y: '#63c74d', // compy green
  H: '#3e8948', // compy shade
  N: '#ead4aa', // compy belly
  Q: '#124e89', // compy stripe
  T: '#8b9bb4', // trike slate
  U: '#5a6988', // trike shade
  V: '#c0cbdc', // trike belly
  F: '#feae34', // trike frill rim
  A: '#ead4aa', // egg shell
  Z: '#c28569', // egg shade
  X: '#63c74d', // egg spots
  P: '#3a4466', // empty heart / UI gray
  p: '#c28569', // pachy tan
  q: '#733e39', // pachy shade
  n: '#e8b796', // pachy belly
  d: '#ead4aa', // pachy bone dome
  c: '#3a4466', // sarco slate
  k: '#262b44', // sarco shade
  y: '#8b9bb4', // sarco belly
  s: '#265c42', // spino pine
  t: '#193c3e', // spino shade
  u: '#c0cbdc', // spino belly
  f: '#be4a2f', // spino sail
  g: '#733e39', // spino sail spines
  '.': null      // transparent
};
