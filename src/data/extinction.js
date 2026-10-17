// Extinction Levels 1–10 (unlocked by clearing the Swamp). Each level keeps
// every modifier below it and adds one more. Higher levels bank more Amber.
export const EXTINCTION = [
  { desc: 'NO MODIFIERS' },
  { desc: 'ENEMIES +10% HP', hp: 0.1 },
  { desc: 'ENEMY WIND-UPS 15% FASTER', tell: 0.85 },
  { desc: 'FEWER NESTS', nest: 0.5 },
  { desc: 'ENEMIES +10% ATK', atk: 0.1 },
  { desc: 'ELITES HAVE 2 TRAITS', eliteTraits: 2 },
  { desc: '1 LIFE FEWER', lives: -1 },
  { desc: 'NESTS HEAL 25% (NOT 40%)', nestHeal: 0.25 },
  { desc: 'ENEMIES +15% HP', hp: 0.15 },
  { desc: 'BOSSES +20% HP AND ATK', boss: 0.2 },
  { desc: 'ENEMIES +15% ATK', atk: 0.15 }
];

export const MAX_EXT = EXTINCTION.length - 1;
export const EXT_AMBER = 0.1; // +10% banked Amber per level

// All modifiers active at a level, folded into one object.
export function extMods(level = 0) {
  const m = { hp: 0, atk: 0, tell: 1, nest: 1, eliteTraits: 1, lives: 0, nestHeal: null, boss: 0 };
  for (const e of EXTINCTION.slice(1, level + 1)) {
    m.hp += e.hp ?? 0;
    m.atk += e.atk ?? 0;
    m.tell *= e.tell ?? 1;
    m.nest *= e.nest ?? 1;
    m.eliteTraits = Math.max(m.eliteTraits, e.eliteTraits ?? 1);
    m.lives += e.lives ?? 0;
    m.nestHeal = e.nestHeal ?? m.nestHeal;
    m.boss += e.boss ?? 0;
  }
  return m;
}
