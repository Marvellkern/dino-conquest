// Zone layouts, enemy groups and scaling. A run goes through ZONE_ORDER; RunEnd after the last boss.
// fights / elites: weighted groups of 1–3 enemies. A member is [species, opts]:
//   opts.hp / opts.atk scale that member (on top of ENEMY_SCALE), opts.elite makes
//   it the elite (level +1, evolved skin, random trait). minRow / maxRow: map columns it can appear in.
const SMALL = { hp: 0.4, atk: 0.7 }; // pack members and elite sidekicks
export const ZONES = {
  jungle: {
    name: 'JUNGLE',
    rows: 7,                       // map columns before the boss
    scale: { hp: 1.15, atk: 1.05 }, // whole-zone difficulty (fights, elites, boss)
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
    scale: { hp: 1.4, atk: 1.35 },
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
  }
};

export const ZONE_ORDER = ['jungle', 'swamp'];
export const nextZone = (id) => ZONE_ORDER[ZONE_ORDER.indexOf(id) + 1] ?? null;

// Clearing a zone boss heals this much before the next zone starts.
export const ZONE_HEAL = 0.5;

// Enemy stat multipliers by node type.
export const ENEMY_SCALE = {
  fight: { hp: 0.7, atk: 0.8 },
  elite: { hp: 0.9, atk: 0.85 },
  boss: { hp: 1.5, atk: 0.75 }
};

export const REWARDS = {
  fight: { xp: 30, amber: 5 },
  elite: { xp: 60, amber: 15 },
  boss: { xp: 40, amber: 50 }
};

// Odds of each node type in the middle columns (elites only from column 3).
export const NODE_WEIGHTS = { fight: 40, elite: 12, nest: 15, fossil: 18, meteor: 15 };

export const NEST_HEAL = 0.4;

// What the map tooltip says for each node type.
export const NODE_INFO = {
  fight: 'FIGHT',
  elite: 'ELITE',
  nest: 'NEST: HEAL 40% HP',
  fossil: 'FOSSIL DIG: PICK AN UPGRADE',
  meteor: 'METEOR SHARD: RISK OR REWARD',
  boss: 'BOSS'
};
