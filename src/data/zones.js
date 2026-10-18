// Zone layouts, enemy groups and scaling. A run goes through the zones it has
// (ZONE_ORDER, minus zones still locked in the Nest); RunEnd after the last boss.
// fights / elites: weighted groups of 1–3 enemies. A member is [species, opts]:
//   opts.hp / opts.atk scale that member (on top of ENEMY_SCALE), opts.elite makes
//   it the elite (level +1, evolved skin, random trait). minRow / maxRow: map columns it can appear in.
const SMALL = { hp: 0.4, atk: 0.7 }; // pack members and elite sidekicks
export const ZONES = {
  jungle: {
    name: 'JUNGLE',
    rows: 7,                       // map columns before the boss
    scale: { hp: 1.75, atk: 1.45 },  // whole-zone difficulty (fights, elites, boss)
    fights: [
      { w: 3, maxRow: 1, members: [['compy', SMALL], ['compy', SMALL]] },
      { w: 3, minRow: 2, members: [['compy', SMALL], ['compy', SMALL], ['compy', SMALL]] },
      { w: 3, minRow: 1, members: [['raptor']] },
      { w: 2, minRow: 3, members: [['raptor'], ['compy', SMALL]] }
    ],
    elites: [{ w: 1, members: [['trike', { elite: true }], ['compy', SMALL]] }],
    // base: the boss's own stat block, so tuning the hatchable T-Rex doesn't move the boss.
    boss: { species: 'rex', skin: 'alpharex', name: 'Alpha Rex', brain: 'alphaRex', level: 1, base: { hp: 110, atk: 16, def: 6, spd: 4 } },
    levelAt: (row) => 1 + Math.floor(row / 2), // enemy level by column
    // Wildlife stat blocks, so tuning the hatchable versions doesn't move the Jungle.
    enemyBase: {
      compy: { hp: 52, atk: 10, def: 4, spd: 9 },
      raptor: { hp: 60, atk: 13, def: 4, spd: 8 },
      trike: { hp: 90, atk: 10, def: 9, spd: 3 }
    }
  },
  swamp: {
    name: 'SWAMP',
    rows: 7,
    scale: { hp: 2.5, atk: 2.0 },
    fights: [
      { w: 3, members: [['pachy']] },
      { w: 3, members: [['sarco']] },
      { w: 2, minRow: 3, members: [['sarco'], ['pachy', SMALL]] },
      { w: 2, minRow: 3, members: [['pachy'], ['pachy', SMALL]] }
    ],
    elites: [
      { w: 1, members: [['sarco', { elite: true }], ['pachy', SMALL]] },
      { w: 1, members: [['raptor', { elite: true }], ['compy', SMALL]] }
    ],
    boss: { species: 'spino', skin: 'spino', name: 'Bog Spino', brain: 'bogSpino', level: 6, base: { hp: 90, atk: 21, def: 4, spd: 5 } },
    levelAt: (row) => 5 + Math.floor(row / 2),
    // Wildlife stat blocks for this zone, so tuning the hatchable versions doesn't move the Swamp.
    enemyBase: {
      pachy: { hp: 64, atk: 11, def: 6, spd: 6 },
      sarco: { hp: 70, atk: 12, def: 7, spd: 5 },
      raptor: { hp: 60, atk: 13, def: 4, spd: 8 },
      compy: { hp: 52, atk: 10, def: 4, spd: 9 }
    }
  },
  volcano: {
    name: 'VOLCANO',
    rows: 7,
    unlock: 'zoneVolcano',
    scale: { hp: 2.6, atk: 2.1 },
    fights: [
      { w: 3, members: [['dimetro']] },
      { w: 3, members: [['ankylo']] },
      { w: 2, members: [['ptera'], ['ptera', SMALL]] },
      { w: 2, minRow: 3, members: [['ankylo'], ['ptera', SMALL]] },
      { w: 2, minRow: 3, members: [['dimetro'], ['compy', SMALL], ['compy', SMALL]] }
    ],
    elites: [
      { w: 1, members: [['ankylo', { elite: true }], ['ptera', SMALL]] },
      { w: 1, members: [['dimetro', { elite: true }], ['ptera', SMALL]] }
    ],
    boss: { species: 'stego', skin: 'cinderstego', name: 'Cinder Stego', brain: 'cinderStego', level: 10, base: { hp: 110, atk: 17, def: 8, spd: 3 } },
    levelAt: (row) => 9 + Math.floor(row / 2),
    enemyBase: {
      ankylo: { hp: 70, atk: 10, def: 9, spd: 3 },
      dimetro: { hp: 66, atk: 12, def: 5, spd: 4 },
      ptera: { hp: 52, atk: 12, def: 3, spd: 10 },
      compy: { hp: 52, atk: 10, def: 4, spd: 9 }
    }
  },
  crater: {
    name: 'METEOR CRATER',
    rows: 7,
    unlock: 'zoneCrater',
    scale: { hp: 3.0, atk: 2.3 },
    fights: [
      { w: 3, members: [['carno']] },
      { w: 3, members: [['stego']] },
      { w: 2, members: [['raptor'], ['raptor', SMALL]] },
      { w: 2, minRow: 3, members: [['stego'], ['ptera', SMALL]] },
      { w: 2, minRow: 3, members: [['carno'], ['raptor', SMALL]] }
    ],
    elites: [
      { w: 1, members: [['carno', { elite: true }], ['raptor', SMALL]] },
      { w: 1, members: [['stego', { elite: true }], ['ptera', SMALL]] }
    ],
    // The final boss: a crystal-grown Tyrant.
    boss: { species: 'rex', skin: 'titanrex', name: 'Meteor Titan', brain: 'meteorTitan', level: 14, base: { hp: 125, atk: 18, def: 8, spd: 5 } },
    levelAt: (row) => 13 + Math.floor(row / 2),
    enemyBase: {
      carno: { hp: 72, atk: 14, def: 5, spd: 6 },
      stego: { hp: 76, atk: 12, def: 7, spd: 3 },
      raptor: { hp: 60, atk: 13, def: 4, spd: 8 },
      ptera: { hp: 52, atk: 12, def: 3, spd: 10 }
    }
  }
};

export const ZONE_ORDER = ['jungle', 'swamp', 'volcano', 'crater'];
// zones: the run's zone list (unlocked ones), see run/run.js.
export const nextZone = (id, zones = ZONE_ORDER) => zones[zones.indexOf(id) + 1] ?? null;

// Enemy HP / ATK multiplier from the first column of a zone (start) to the last before the boss (end).
export const RAMP = { start: 0.8, end: 1.3 };

// Clearing a zone boss heals this much before the next zone starts.
export const ZONE_HEAL = 0.35;

// Enemy stat multipliers by node type.
export const ENEMY_SCALE = {
  fight: { hp: 0.7, atk: 0.8 },
  elite: { hp: 0.9, atk: 0.85 },
  boss: { hp: 1.5, atk: 0.75 }
};

export const REWARDS = {
  fight: { xp: 30, amber: 8 },
  elite: { xp: 60, amber: 20 },
  boss: { xp: 40, amber: 50 }
};

// Odds of each node type in the middle columns (elites only from column 3,
// shops from column 2).
export const NODE_WEIGHTS = { fight: 36, elite: 12, nest: 13, fossil: 15, meteor: 14, shop: 10 };

// Lane personalities (lane 0 = top): multipliers on NODE_WEIGHTS. The top lane is
// risky (elites, digs), the bottom lane is safe (nests, shops).
export const LANE_BIAS = [
  { elite: 2.2, fossil: 1.6, nest: 0.4, shop: 0.6 },
  {},
  { elite: 0.3, fossil: 0.7, nest: 2, shop: 1.8 }
];

// Shop: prices in in-run Amber (spending it means banking less at the end).
export const SHOP = { relic: 35, mutation: 30, heal: 15, healFrac: 0.4 };

export const NEST_HEAL = 0.3;

// What the map tooltip says for each node type.
export const NODE_INFO = {
  fight: 'FIGHT',
  elite: 'ELITE',
  nest: 'NEST: HEAL 30% HP',
  fossil: 'FOSSIL DIG: PICK A FOSSIL',
  meteor: 'METEOR SHARD: RISK OR REWARD',
  shop: 'SHOP: SPEND RUN AMBER',
  boss: 'BOSS'
};
