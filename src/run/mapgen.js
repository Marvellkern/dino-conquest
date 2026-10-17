import { ZONES, NODE_WEIGHTS } from '../data/zones.js';
import { TRAITS } from '../data/traits.js';
import { SPECIES } from '../data/species.js';

// Branching zone map: `rows` columns of 1–3 nodes on 3 lanes, then the boss.
// Each node links to the nodes in the next column on its own or adjacent lanes.
// Node: { id, row, lane, type, next: [ids], enemy?, done? }

function weighted(rng, weights) {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let r = rng.next() * total;
  for (const [k, w] of Object.entries(weights)) {
    if ((r -= w) < 0) return k;
  }
  return Object.keys(weights)[0];
}

function pickType(rng, row, rows) {
  if (row <= 1) return 'fight';
  if (row === rows - 1) return rng.chance(0.6) ? 'nest' : 'fossil'; // breather before the boss
  const w = { ...NODE_WEIGHTS };
  if (row < 3) delete w.elite;
  return weighted(rng, w);
}

const closest = (nodes, lane) => nodes.reduce((a, b) => (Math.abs(b.lane - lane) < Math.abs(a.lane - lane) ? b : a));

function makeEnemy(rng, zone, node) {
  const lv = zone.levelAt(node.row), base = (species) => zone.enemyBase?.[species];
  if (node.type === 'fight') {
    const species = rng.pick(zone.enemies);
    return { species, level: lv, base: base(species) };
  }
  if (node.type === 'elite') {
    const species = rng.pick(zone.elites);
    return { species, level: lv + 1, evo: 1, name: `Elite ${SPECIES[species].name}`, trait: rng.pick(Object.keys(TRAITS)), base: base(species) };
  }
  return { ...zone.boss };
}

export function generateMap(rng, zoneId) {
  const zone = ZONES[zoneId];
  const cols = [];
  for (let r = 0; r < zone.rows; r++) {
    const count = r === 0 ? 1 : rng.int(2, 3);
    const lanes = count === 1 ? [1] : count === 3 ? [0, 1, 2] : rng.pick([[0, 1], [1, 2], [0, 2]]);
    cols.push(lanes.map((lane) => ({ id: `${r}-${lane}`, row: r, lane, type: pickType(rng, r, zone.rows), next: [] })));
  }
  cols.push([{ id: 'boss', row: zone.rows, lane: 1, type: 'boss', next: [] }]);

  // Guarantee one elite in the middle of the zone.
  const mid = cols.slice(3, zone.rows - 1).flat();
  if (!mid.some((n) => n.type === 'elite')) rng.pick(mid).type = 'elite';

  for (let r = 0; r < cols.length - 1; r++) {
    const cur = cols[r], nxt = cols[r + 1];
    for (const n of cur) {
      const near = nxt.filter((m) => Math.abs(m.lane - n.lane) <= 1);
      for (const m of near.length ? near : [closest(nxt, n.lane)]) n.next.push(m.id);
    }
    for (const m of nxt) if (!cur.some((n) => n.next.includes(m.id))) closest(cur, m.lane).next.push(m.id);
  }

  const nodes = {};
  for (const n of cols.flat()) {
    if (n.type === 'fight' || n.type === 'elite' || n.type === 'boss') n.enemy = makeEnemy(rng, zone, n);
    nodes[n.id] = n;
  }
  return { nodes, cols: cols.map((c) => c.map((n) => n.id)), start: cols[0][0].id };
}
