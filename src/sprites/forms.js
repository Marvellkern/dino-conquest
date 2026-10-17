import { PAL } from '../data/palette.js';
import { shiftedColor, EVO_SHIFT } from './skins.js';

// Evolved forms are built from the base grid with a few pixel operations, so
// each form gets a new silhouette (not just a recolor), then a palette:
//   pad    { top, right, left }        room for new features
//   grow   [{ x0, x1, h, key, topKey }] raise the top contour of columns (crest, frill, sail, dome)
//   spikes [{ x0, x1, every, key }]     spikes along the top contour
//   rays   [{ x, y, dx, dy, len, key }] horns / claws
//   paint  [{ key, pts: [[x, y]...] }]  scars, plates, eye trails
//   stretch { cols, rows }             duplicate columns / rows (applied last)
// Feature coordinates are in the BASE grid; padding offsets are applied for you.
// New pixels get a 1px outline wherever they touch empty space.

const cloneRows = (g) => g.map((r) => [...r]);

function padRows(rows, { top = 0, right = 0, left = 0 }) {
  const w = rows[0].length + left + right;
  const out = rows.map((r) => [...'.'.repeat(left), ...r, ...'.'.repeat(right)]);
  for (let i = 0; i < top; i++) out.unshift([...'.'.repeat(w)]);
  return out;
}

function outline(rows, pts) {
  for (const [x, y] of pts) {
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      if (rows[ny]?.[nx] === '.') rows[ny][nx] = 'O';
    }
  }
}

const topOf = (rows, x) => rows.findIndex((r) => r[x] !== '.');

function grow(rows, { x0, x1, h, key, topKey = key }) {
  const added = [];
  for (let x = x0; x <= x1; x++) {
    const top = topOf(rows, x);
    if (top < 0) continue;
    for (let k = 0; k <= h && top - k >= 0; k++) {
      rows[top - k][x] = k === h ? topKey : key;
      added.push([x, top - k]);
    }
  }
  outline(rows, added);
}

function spikes(rows, { x0, x1, every = 2, key = 'W' }) {
  for (let x = x0; x <= x1; x += every) {
    const top = topOf(rows, x);
    if (top < 2) continue;
    rows[top - 1][x] = key;
    rows[top - 2][x] = 'O';
    for (const sx of [x - 1, x + 1]) if (rows[top - 1][sx] === '.') rows[top - 1][sx] = 'O';
  }
}

function ray(rows, { x, y, dx, dy, len, key = 'W' }) {
  const pts = [];
  for (let i = 1; i <= len; i++) {
    const px = x + dx * i, py = y + dy * i;
    if (rows[py]?.[px] === undefined) break;
    rows[py][px] = key;
    pts.push([px, py]);
  }
  outline(rows, pts);
}

function stretch(rows, { cols = [], rows: rr = [] }) {
  const wide = rows.map((r) => r.flatMap((ch, x) => (cols.includes(x) ? [ch, ch] : [ch])));
  return wide.flatMap((r, y) => (rr.includes(y) ? [r, [...r]] : [r]));
}

// Build one form. Returns { grid, layout, mapRow } — layout: shifts for the T-rex
// part rig; mapRow(y): where a base-grid row ended up (for the crouch frame).
export function buildForm(base, f) {
  const p = { top: 0, right: 0, left: 0, ...f.pad };
  const off = ([x, y]) => [x + p.left, y + p.top];
  let rows = padRows(cloneRows(base), p);
  for (const g of f.grow ?? []) grow(rows, { ...g, x0: g.x0 + p.left, x1: g.x1 + p.left });
  for (const s of f.spikes ?? []) spikes(rows, { ...s, x0: s.x0 + p.left, x1: s.x1 + p.left });
  for (const r of f.rays ?? []) { const [x, y] = off([r.x, r.y]); ray(rows, { ...r, x, y }); }
  for (const pt of f.paint ?? []) for (const xy of pt.pts) { const [x, y] = off(xy); if (rows[y]?.[x] !== undefined) rows[y][x] = pt.key; }
  const cols = (f.stretch?.cols ?? []).map((c) => c + p.left);
  const rws = (f.stretch?.rows ?? []).map((r) => r + p.top);
  rows = stretch(rows, { cols, rows: rws });
  const layout = { dx: p.left + cols.filter((c) => c < 16 + p.left).length, dy: p.top + rws.filter((r) => r < 19 + p.top).length };
  const mapRow = (y) => y + p.top + rws.filter((r) => r < y + p.top).length;
  return { grid: rows.map((r) => r.join('')), layout, mapRow };
}

// Palette per form: form 1 shifts hue, form 2 has its own colors.
const custom = (map) => (ch) => map[ch] ?? PAL[ch];
export function formColor(f, evo) {
  if (f.colors) return custom(f.colors);
  return shiftedColor(EVO_SHIFT[evo]);
}

// The recipes: [form 1, form 2] per species.
export const FORM_ART = {
  compy: [
    { spikes: [{ x0: 4, x1: 11, every: 2 }], stretch: { cols: [9, 15], rows: [2] } },
    { pad: { top: 3 }, grow: [{ x0: 14, x1: 17, h: 2, key: 'S' }], spikes: [{ x0: 3, x1: 11, every: 2 }],
      stretch: { cols: [9, 10, 15, 16], rows: [2, 9] },
      colors: { Y: '#c8a830', H: '#7a5c1c', N: '#f0e0a0', Q: '#a02828' } }
  ],
  raptor: [
    { pad: { top: 1 }, spikes: [{ x0: 1, x1: 8, every: 2, key: 'C' }], paint: [{ key: 'C', pts: [[21, 13], [20, 14]] }],
      stretch: { cols: [11, 12], rows: [10] } },
    { pad: { top: 1 }, spikes: [{ x0: 3, x1: 12, every: 2, key: 'W' }], paint: [{ key: 'E', pts: [[17, 2], [18, 2], [19, 2]] }],
      stretch: { cols: [11, 12, 13], rows: [9, 10] },
      colors: { R: '#3e3450', B: '#262036', K: '#1a1424', C: '#6e5e86', E: '#ff3030' } }
  ],
  trike: [
    { pad: { top: 4 }, grow: [{ x0: 14, x1: 24, h: 3, key: 'T', topKey: 'F' }], stretch: { cols: [8, 9], rows: [13] } },
    { pad: { top: 4, right: 2 }, grow: [{ x0: 15, x1: 23, h: 2, key: 'T', topKey: 'F' }],
      rays: [{ x: 31, y: 2, dx: 1, dy: -1, len: 2 }, { x: 27, y: 5, dx: 0, dy: -1, len: 3 }, { x: 33, y: 9, dx: 1, dy: -1, len: 2 }],
      spikes: [{ x0: 5, x1: 12, every: 2, key: 'U' }], stretch: { cols: [8, 9, 10], rows: [13] },
      colors: { T: '#8a6a5a', U: '#5a4038', V: '#d8c8a8', F: '#e05030' } }
  ],
  rex: [
    { spikes: [{ x0: 6, x1: 15, every: 3 }], paint: [{ key: 'W', pts: [[10, 14], [11, 13], [12, 12], [13, 16], [14, 15]] }],
      stretch: { cols: [8, 9], rows: [15] } },
    { spikes: [{ x0: 5, x1: 15, every: 2 }], paint: [{ key: 'W', pts: [[10, 14], [11, 13], [12, 12], [13, 16], [14, 15]] }],
      stretch: { cols: [7, 8, 9], rows: [14, 15] },
      colors: { G: '#8c2c24', D: '#58181a', L: '#c89070', M: '#2a0808', E: '#ffe040' } }
  ],
  pachy: [
    { pad: { top: 3 }, grow: [{ x0: 12, x1: 18, h: 2, key: 'd' }], stretch: { cols: [12, 13], rows: [10] } },
    { pad: { top: 5 }, grow: [{ x0: 11, x1: 19, h: 2, key: 'd' }], spikes: [{ x0: 10, x1: 20, every: 2 }],
      stretch: { cols: [12, 13, 14], rows: [10, 11] },
      colors: { p: '#6a6a7a', q: '#3a3a4a', n: '#b0b0c0', d: '#e0d8c8' } }
  ],
  sarco: [
    { pad: { top: 2 }, spikes: [{ x0: 5, x1: 20, every: 3, key: 'k' }], stretch: { cols: [12, 26, 27] } },
    { pad: { top: 2 }, spikes: [{ x0: 4, x1: 21, every: 2, key: 'k' }], stretch: { cols: [12, 13, 26, 27, 28], rows: [5, 6] },
      colors: { c: '#3a5a3a', k: '#203a24', y: '#8a9a60', E: '#ffd040' } }
  ],
  spino: [
    { pad: { top: 4 }, grow: [{ x0: 6, x1: 17, h: 3, key: 'f', topKey: 'g' }], stretch: { cols: [14, 15], rows: [13] } },
    { pad: { top: 6 }, grow: [{ x0: 5, x1: 18, h: 5, key: 'f', topKey: 'g' }], stretch: { cols: [14, 15, 16], rows: [12, 13] },
      colors: { s: '#2a6aa8', t: '#1a3a6a', u: '#a0c8e8', f: '#30c0b0', g: '#1a7a70' } }
  ]
};
