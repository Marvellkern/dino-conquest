import { makeSpriteSet } from './renderSprite.js';

// T-rex is split into parts so the bite can be animated by offsets (brief §4.3):
//   skull  = rows 0–6, x ≥ 16 (upper head + upper teeth)
//   jaw    = rows 7–9, x ≥ 21
//   legs   = rows 19+
//   body   = everything else
// Evolved forms stretch the body, so layout { dx, dy } shifts those borders
// (dx: columns added left of the head, dy: rows added above the legs).
// Each part is a full-size texture with the other pixels transparent, so the
// rig just shifts whole images around.
export const FILL_MAX = 6;

export function rexPartOf(x, y, { dx = 0, dy = 0 } = {}) {
  if (y <= 6 && x >= 16 + dx) return 'skull';
  if (y >= 7 && y <= 9 && x >= 21 + dx) return 'jaw';
  if (y >= 19 + dy) return 'legs';
  return 'body';
}

const mask = (grid, name, layout) =>
  grid.map((row, y) => [...row].map((ch, x) => (rexPartOf(x, y, layout) === name ? ch : '.')).join(''));

// Jaw-open gap filler: when the skull lifts by `gap` px, these rows appear
// between skull and jaw: outline + shade + green back-of-head, then mouth interior.
function fillGrid(gap, w, h, dx) {
  const rows = Array.from({ length: h }, () => '.'.repeat(w));
  const line = ('.'.repeat(16 + dx) + 'OD' + 'GGGGG' + 'MMMMMM').padEnd(w, '.');
  for (let y = 7 - gap; y <= 6; y++) rows[y] = line;
  return rows;
}

// Builds `${key}_legs/_body/_jaw/_skull` and `${key}_fill1..6` (+ _flash variants).
export function buildRexParts(scene, key, grid, colorOf, layout = {}) {
  for (const name of ['legs', 'body', 'jaw', 'skull']) makeSpriteSet(scene, `${key}_${name}`, mask(grid, name, layout), colorOf);
  const w = grid[0].length, h = grid.length;
  for (let g = 1; g <= FILL_MAX; g++) makeSpriteSet(scene, `${key}_fill${g}`, fillGrid(g, w, h, layout.dx ?? 0), colorOf);
}
