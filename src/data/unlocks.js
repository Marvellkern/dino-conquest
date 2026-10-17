// Permanent Nest unlocks, bought with banked Amber (scenes/Nest.js).
// cost: a number, or one price per level for the stackable stat bonuses.
// soon: content that lands in Phase 5 (listed, not buyable yet).
export const UNLOCKS = {
  packPrimal:  { name: 'Primal Fossils',  desc: 'METEOR CHIP, BONE DRUM, ECHO ROCK, VENOM GLAND', short: '+4 FOSSILS', cost: 80 },
  packDeep:    { name: 'Deep Time Fossils', desc: 'OLD EGG, VOLCANIC HEART, TAR PIT, SWIFT FEATHER', short: '+4 FOSSILS', cost: 80 },
  twinClutch:  { name: 'Twin Clutch',     desc: 'PICK 1 OF 2 EGGS WHEN YOU HATCH', short: 'PICK 1 OF 2 EGGS', cost: 120 },
  traderTrail: { name: 'Trader Trails',   desc: 'SHOPS APPEAR TWICE AS OFTEN', short: 'MORE SHOPS', cost: 100 },
  sturdy:      { name: 'Sturdy Blood',    desc: '+5 BASE HP PER LEVEL', short: '+5 HP', cost: [40, 70, 100] },
  whisper:     { name: 'Egg Whisper',     desc: '+1 FREE REROLL EACH HATCH', short: '+1 FREE REROLL', cost: [50, 90] },
  nineLives:   { name: 'Nine Lives',      desc: '+1 LIFE EACH RUN', short: '+1 LIFE', cost: [150] },
  eggAnkylo:   { name: 'Ankylo Egg',      desc: 'NEW SPECIES', short: 'NEW SPECIES', cost: 60, soon: true },
  eggPtera:    { name: 'Pteranodon Egg',  desc: 'NEW SPECIES', short: 'NEW SPECIES', cost: 90, soon: true },
  eggStego:    { name: 'Stego Egg',       desc: 'NEW SPECIES', short: 'NEW SPECIES', cost: 120, soon: true },
  eggCarno:    { name: 'Carno Egg',       desc: 'NEW SPECIES', short: 'NEW SPECIES', cost: 150, soon: true },
  zoneVolcano: { name: 'The Volcano',     desc: 'ZONE 3', short: 'ZONE 3', cost: 200, soon: true },
  zoneCrater:  { name: 'Meteor Crater',   desc: 'ZONE 4 + FINAL BOSS', short: 'ZONE 4', cost: 400, soon: true }
};

export const UNLOCK_ORDER = Object.keys(UNLOCKS);
export const levelsOf = (id) => (Array.isArray(UNLOCKS[id].cost) ? UNLOCKS[id].cost.length : 1);
export const priceOf = (id, owned) => (Array.isArray(UNLOCKS[id].cost) ? UNLOCKS[id].cost[owned] : UNLOCKS[id].cost);

export const STURDY_HP = 5;

// Fossil pool. A new save drops only BASE_RELICS; packs are bought, and the
// GOAL_RELICS come from goals (data/goals.js).
export const BASE_RELICS = ['amberFang', 'sharpStone', 'fernCushion', 'stormEgg', 'bloodAmber', 'huntersEye', 'tailSpike', 'mossyShell'];
export const PACK_RELICS = {
  packPrimal: ['meteorChip', 'boneDrum', 'echoRock', 'venomGland'],
  packDeep: ['oldEgg', 'volcanicHeart', 'tarPitStone', 'swiftFeather']
};
export const GOAL_RELICS = ['raptorClaw', 'packTotem', 'thickSkull', 'glowShard'];

// Mutations that start locked ("move:id"); goals unlock them.
export const LOCKED_MUTATIONS = ['bite:chain', 'tail:stun', 'roar:rally'];

// Golden Egg (a goal reward): Rare or better, costs Amber each time.
export const GOLDEN_EGG_COST = 40;
