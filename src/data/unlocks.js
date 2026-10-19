// Permanent Nest unlocks, bought with banked Amber (scenes/Nest.js).
// cost: a number, or one price per level for the stackable stat bonuses.
// needs: another unlock that has to be owned first.
export const UNLOCKS = {
  packPrimal:  { name: 'Primal Fossils',  desc: 'METEOR CHIP, BONE DRUM, ECHO ROCK, VENOM GLAND', short: '+4 FOSSILS', cost: 80 },
  packDeep:    { name: 'Deep Time Fossils', desc: 'OLD EGG, VOLCANIC HEART, TAR PIT, SWIFT FEATHER', short: '+4 FOSSILS', cost: 80 },
  packVolcano: { name: 'Volcanic Fossils', desc: 'EMBER CORE, OBSIDIAN SCALE, LAVA FANG, ASH CLOAK', short: '+4 FOSSILS', cost: 100 },
  packStar:    { name: 'Star Fossils',     desc: 'STAR SHARD, CRYSTAL HEART, METEOR IRON, AMBER GEODE', short: '+4 FOSSILS', cost: 100 },
  packTide:    { name: 'Tide Fossils',     desc: 'PEARL HEART, TIDE CHARM, KELP WRAP, SHARK TOOTH', short: '+4 FOSSILS', cost: 120 },
  twinClutch:  { name: 'Twin Clutch',     desc: 'PICK 1 OF 2 EGGS WHEN YOU HATCH', short: 'PICK 1 OF 2 EGGS', cost: 120 },
  traderTrail: { name: 'Trader Trails',   desc: 'SHOPS APPEAR TWICE AS OFTEN', short: 'MORE SHOPS', cost: 100 },
  sturdy:      { name: 'Sturdy Blood',    desc: '+5 BASE HP PER LEVEL', short: '+5 HP', cost: [40, 70, 100] },
  whisper:     { name: 'Egg Whisper',     desc: '+1 FREE REROLL EACH HATCH', short: '+1 FREE REROLL', cost: [50, 90] },
  nineLives:   { name: 'Nine Lives',      desc: '+1 LIFE EACH RUN', short: '+1 LIFE', cost: [150] },
  eggAnkylo:   { name: 'Ankylo Egg',      desc: 'COMMON: ARMORED, CLUB SMASH STUNS ON CRIT', short: 'NEW SPECIES', cost: 60 },
  eggPtera:    { name: 'Pteranodon Egg',  desc: 'RARE: FAST FLIER, DIVE BOMB NEVER MISSES', short: 'NEW SPECIES', cost: 90 },
  eggStego:    { name: 'Stego Egg',       desc: 'EPIC: SPIKED TAIL POISONS', short: 'NEW SPECIES', cost: 120 },
  eggCarno:    { name: 'Carno Egg',       desc: 'LEGENDARY: GORE RUSH FINISHES THE WOUNDED', short: 'NEW SPECIES', cost: 150 },
  eggDilo:     { name: 'Dilopho Egg',     desc: 'RARE: CHEAP VENOM SPIT POISONS AND CALMS A FOE', short: 'NEW SPECIES', cost: 120 },
  eggTheri:    { name: 'Therizino Egg',   desc: 'EPIC: SCYTHE CLAWS, EACH CRIT ADDS DEF', short: 'NEW SPECIES', cost: 180 },
  zoneVolcano: { name: 'The Volcano',     desc: 'ZONE 3 AFTER THE SWAMP: CINDER STEGO', short: 'ZONE 3', cost: 200 },
  zoneCoast:   { name: 'Tidal Coast',     desc: 'ZONE 4 AFTER THE VOLCANO: ABYSS MOSASAUR', short: 'ZONE 4', cost: 300, needs: 'zoneVolcano' },
  zoneCrater:  { name: 'Meteor Crater',   desc: 'ZONE 5: THE FINAL BOSS', short: 'ZONE 5', cost: 400, needs: 'zoneCoast' }
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
  packDeep: ['oldEgg', 'volcanicHeart', 'tarPitStone', 'swiftFeather'],
  packVolcano: ['emberCore', 'obsidianScale', 'lavaFang', 'ashCloak'],
  packStar: ['starShard', 'crystalHeart', 'meteorIron', 'amberGeode'],
  packTide: ['pearlHeart', 'tideCharm', 'kelpWrap', 'sharkTooth']
};
export const GOAL_RELICS = ['raptorClaw', 'packTotem', 'thickSkull', 'glowShard', 'twinHorn', 'pteraBone'];

// Mutations that start locked ("move:id"); goals unlock them.
export const LOCKED_MUTATIONS = ['bite:chain', 'tail:stun', 'roar:rally'];

// Golden Egg (a goal reward): Rare or better, costs Amber each time.
export const GOLDEN_EGG_COST = 40;
