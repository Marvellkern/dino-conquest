// Hatch odds, reroll prices and rarity colors.
export const RARITIES = {
  common:    { name: 'COMMON',    odds: 0.60, color: '#b0b4bc' },
  rare:      { name: 'RARE',      odds: 0.28, color: '#5aa0e0' },
  epic:      { name: 'EPIC',      odds: 0.10, color: '#b070e0' },
  legendary: { name: 'LEGENDARY', odds: 0.02, color: '#f0c040' }
};

export const REROLL_COST = { species: 30, trait: 15 };

// Species + trait reels together stay within 1.5s (and a tap skips them).
export const SPIN_MS = { species: 900, trait: 600 };
