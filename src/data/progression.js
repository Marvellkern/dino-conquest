// Leveling and evolution.
export const PROGRESSION = {
  growth: 0.08,          // +8% base stats per level
  evoBoost: 0.15,        // +15% stats per evolution
  evoLevels: [5, 10],
  evoHeal: 0.3,          // evolving heals 30% max HP
  maxTraits: 3
};

export const xpToNext = (level) => level * 10;

// Display suffix per evolution stage.
export const EVO_SUFFIX = ['', ' II', ' III'];

export const BASE_LIVES = 3;
export const RETRY_HP = 0.5; // a lost fight restarts at 50% HP
