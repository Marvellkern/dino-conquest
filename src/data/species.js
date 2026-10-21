// Base stats per species. Tune freely — all combat math reads from here.
// enemyOnly: true keeps a species out of the hatch spin and the Dino-dex (Dimetrodon).
// unlock: a Nest unlock (data/unlocks.js) that has to be bought before it can hatch.
// short: a shorter name for tight spots (Dino-dex cards).
// big: drawn one scale step smaller on the player's side (the Mosasaur would fill the screen).
export const SPECIES = {
  compy:  { name: 'Compy',  rarity: 'common',    hp: 52,  atk: 11, def: 4, spd: 9, special: 'swarm' },
  raptor: { name: 'Raptor', rarity: 'rare',      hp: 60,  atk: 13, def: 4, spd: 8, special: 'doubleSlash' },
  trike:  { name: 'Trike',  rarity: 'epic',      hp: 76,  atk: 10, def: 7, spd: 3, special: 'hornCharge' },
  rex:    { name: 'T-Rex',  rarity: 'legendary', hp: 78,  atk: 13, def: 4, spd: 3, special: 'crushingBite' },
  pachy:  { name: 'Pachy',  rarity: 'common',    hp: 50,  atk: 11, def: 4, spd: 5, special: 'skullBash' },
  sarco:  { name: 'Sarco',  rarity: 'rare',      hp: 62,  atk: 11, def: 5, spd: 6, special: 'deathRoll' },
  spino:  { name: 'Spino',  rarity: 'epic',      hp: 52,  atk: 11, def: 3, spd: 5, special: 'swampSurge' },
  ankylo: { name: 'Ankylo', rarity: 'common',    hp: 60,  atk: 9,  def: 5, spd: 3, special: 'clubSmash', unlock: 'eggAnkylo' },
  ptera:  { name: 'Pteranodon', rarity: 'rare',  hp: 58,  atk: 12, def: 4, spd: 10, special: 'diveBomb', unlock: 'eggPtera' },
  stego:  { name: 'Stego',  rarity: 'epic',      hp: 74,  atk: 12, def: 7, spd: 3, special: 'thagomizer', unlock: 'eggStego' },
  carno:  { name: 'Carno',  rarity: 'legendary', hp: 72,  atk: 13, def: 4, spd: 6, special: 'goreRush', unlock: 'eggCarno' },
  dimetro: { name: 'Dimetrodon', rarity: 'rare', hp: 64,  atk: 12, def: 5, spd: 4, special: 'deathRoll', enemyOnly: true },
  // v2.2 Nest eggs: a fast debuffer and a tanky bruiser.
  dilo:   { name: 'Dilophosaurus', short: 'Dilopho', rarity: 'rare', hp: 54, atk: 12, def: 3, spd: 9, special: 'venomSpit', unlock: 'eggDilo' },
  theri:  { name: 'Therizinosaurus', short: 'Therizino', rarity: 'epic', hp: 64, atk: 11, def: 4, spd: 3, special: 'scytheClaws', unlock: 'eggTheri' },
  // Tidal Coast creatures, playable since v2.7 from their Nest eggs (the Coast's own
  // wildlife and boss keep their stat blocks in data/zones.js, so these don't move the zone).
  plesio: { name: 'Plesiosaur', short: 'Plesio', rarity: 'rare', hp: 60, atk: 11, def: 5, spd: 5, special: 'neckLash', unlock: 'eggPlesio' },
  ichthy: { name: 'Ichthyosaur', short: 'Ichthyo', rarity: 'common', hp: 54, atk: 11, def: 3, spd: 11, special: 'shoalRush', unlock: 'eggIchthy' },
  bary:   { name: 'Baryonyx', rarity: 'epic', hp: 74, atk: 12, def: 5, spd: 5, special: 'riverClaw', unlock: 'eggBary' },
  mosa:   { name: 'Mosasaur', rarity: 'legendary', hp: 80, atk: 13, def: 5, spd: 4, special: 'abyssBreach', unlock: 'eggMosa', big: true }
};

export const HATCHABLE = Object.keys(SPECIES).filter((id) => !SPECIES[id].enemyOnly);
