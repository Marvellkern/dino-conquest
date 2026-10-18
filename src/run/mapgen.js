import { ZONES, NODE_WEIGHTS, LANE_BIAS, RAMP } from '../data/zones.js';
import { TRAITS } from '../data/traits.js';
import { SPECIES } from '../data/species.js';

// Branching zone map: `rows` columns of 1–3 nodes on 3 lanes, then the boss.
// Each node links to the nodes in the next column on its own or adjacent lanes.
// Node: { id, row, lane, type, next: [ids], enemies?, done? }

function weighted(rng, weights) {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let r = rng.next() * total;
  for (const [k, w] of Object.entries(weights)) {
    if ((r -= w) < 0) return k;
  }
  return Object.keys(weights)[0];
}

// mods: run modifiers (Extinction: mods.nest; Trader Trails: mods.shop).
function pickType(rng, row, rows, lane, mods) {
  if (row <= 1) return 'fight';
  if (row === rows - 1) return rng.chance(0.6 * (mods.nest ?? 1)) ? 'nest' : rng.chance(0.5) ? 'shop' : 'fossil'; // breather before the boss
  const w = { ...NODE_WEIGHTS };
  w.nest *= mods.nest ?? 1;
  w.shop *= mods.shop ?? 1;
  if (row < 3) delete w.elite;
  for (const [k, mult] of Object.entries(LANE_BIAS[lane] ?? {})) if (k in w) w[k] *= mult;
  return weighted(rng, w);
}

const closest = (nodes, lane) => nodes.reduce((a, b) => (Math.abs(b.lane - lane) < Math.abs(a.lane - lane) ? b : a));

function pickGroup(rng, groups, row) {
  const ok = groups.filter((g) => (g.minRow ?? 0) <= row && row <= (g.maxRow ?? 99));
  let r = rng.next() * ok.reduce((t, g) => t + g.w, 0);
  for (const g of ok) if ((r -= g.w) < 0) return g;
  return ok[0];
}

// Enemy specs for a battle node: [{ species, level, base, brain, hp, atk, evo, name, trait, skin }].
function makeEnemies(rng, zone, node, mods) {
  const z0 = zone.scale ?? { hp: 1, atk: 1 };
  const zs = { hp: z0.hp * (1 + (mods.hp ?? 0)), atk: z0.atk * (1 + (mods.atk ?? 0)) };
  const boss = 1 + (mods.boss ?? 0);
  if (node.type === 'boss') return [{ ...zone.boss, hp: zs.hp * boss, atk: zs.atk * boss }];
  const lv = zone.levelAt(node.row);
  // Difficulty ramp across the zone: gentle first fights, tougher near the boss.
  const k = RAMP.start + (RAMP.end - RAMP.start) * (node.row / Math.max(1, zone.rows - 1));
  const group = pickGroup(rng, node.type === 'elite' ? zone.elites : zone.fights, node.row);
  return group.members.map(([species, o = {}]) => {
    const e = { species, level: lv, base: zone.enemyBase?.[species], hp: (o.hp ?? 1) * zs.hp * k, atk: (o.atk ?? 1) * zs.atk * k, small: (o.hp ?? 1) < 1 };
    if (o.elite) {
      const pool = Object.keys(TRAITS), traits = [];
      while (traits.length < (mods.eliteTraits ?? 1)) traits.push(pool.splice(Math.floor(rng.next() * pool.length), 1)[0]);
      Object.assign(e, { level: lv + 1, evo: 1, name: `Elite ${SPECIES[species].name}`, traits });
    }
    return e;
  });
}

export function generateMap(rng, zoneId, mods = {}) {
  const zone = ZONES[zoneId];
  const cols = [];
  for (let r = 0; r < zone.rows; r++) {
    const count = r === 0 ? 1 : rng.int(2, 3);
    const lanes = count === 1 ? [1] : count === 3 ? [0, 1, 2] : rng.pick([[0, 1], [1, 2], [0, 2]]);
    cols.push(lanes.map((lane) => ({ id: `${r}-${lane}`, row: r, lane, type: pickType(rng, r, zone.rows, lane, mods), next: [] })));
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
    if (n.type === 'fight' || n.type === 'elite' || n.type === 'boss') n.enemies = makeEnemies(rng, zone, n, mods);
    nodes[n.id] = n;
  }
  return { nodes, cols: cols.map((c) => c.map((n) => n.id)), start: cols[0][0].id };
}
