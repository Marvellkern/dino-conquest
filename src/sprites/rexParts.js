import { makeSpriteSet } from './renderSprite.js';

// T-rex is split into parts so the bite can be animated by offsets (brief §4.3):
//   skull  = rows 0–6, x ≥ 16 (upper head + upper teeth)
//   jaw    = rows 7–9, x ≥ 21
//   legs   = rows 19+
//   body   = everything else
// Each part is a full-size 32x26 texture with the other pixels transparent,
// so the rig just shifts whole images around.
export const FILL_MAX = 6;

export function rexPartOf(x, y) {
  if (y <= 6 && x >= 16) return 'skull';
  if (y >= 7 && y <= 9 && x >= 21) return 'jaw';
  if (y >= 19) return 'legs';
  return 'body';
}

const mask = (grid, name) =>
  grid.map((row, y) => [...row].map((ch, x) => (rexPartOf(x, y) === name ? ch : '.')).join(''));

// Jaw-open gap filler: when the skull lifts by `gap` px, these rows appear
// between skull and jaw: outline + shade + green back-of-head, then mouth interior.
function fillGrid(gap, w, h) {
  const rows = Array.from({ length: h }, () => '.'.repeat(w));
  const line = ('.'.repeat(16) + 'OD' + 'GGGGG' + 'MMMMMM').padEnd(w, '.');
  for (let y = 7 - gap; y <= 6; y++) rows[y] = line;
  return rows;
}

// Builds `${key}_legs/_body/_jaw/_skull` and `${key}_fill1..6` (+ _flash variants).
export function buildRexParts(scene, key, grid, colorOf) {
  for (const name of ['legs', 'body', 'jaw', 'skull']) makeSpriteSet(scene, `${key}_${name}`, mask(grid, name), colorOf);
  for (let g = 1; g <= FILL_MAX; g++) makeSpriteSet(scene, `${key}_fill${g}`, fillGrid(g, 32, 26), colorOf);
}
