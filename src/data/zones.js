// Zone layouts, enemy pools and scaling. A run goes through ZONE_ORDER; RunEnd after the last boss.
export const ZONES = {
  jungle: {
    name: 'JUNGLE',
    rows: 7,                       // map columns before the boss
    enemies: ['compy', 'raptor'],
    elites: ['trike'],
    // base: the boss's own stat block, so tuning the hatchable T-Rex doesn't move the boss.
    boss: { species: 'rex', skin: 'alpharex', name: 'Alpha Rex', level: 1, special: 'primalChomp', base: { hp: 110, atk: 16, def: 6, spd: 4 } },
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
    enemies: ['pachy', 'sarco'],
    elites: ['sarco', 'raptor'],
    boss: { species: 'spino', skin: 'spino', name: 'Bog Spino', level: 6, special: 'swampSurge', base: { hp: 90, atk: 21, def: 4, spd: 5 } },
    levelAt: (row) => 5 + Math.floor(row / 2),
    // Wildlife stat blocks for this zone, so tuning the hatchable versions doesn't move the Swamp.
    enemyBase: {
      pachy: { hp: 64, atk: 11, def: 6, spd: 6 },
      sarco: { hp: 70, atk: 12, def: 7, spd: 5 },
      raptor: { hp: 60, atk: 13, def: 4, spd: 8 }
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
