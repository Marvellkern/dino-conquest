// Base stats per species. Tune freely — all combat math reads from here.
// enemyOnly: true keeps a species out of the hatch spin and the Dino-dex (none use it right now).
export const SPECIES = {
  compy:  { name: 'Compy',  rarity: 'common',    hp: 52,  atk: 10, def: 4, spd: 9, special: 'swarm' },
  raptor: { name: 'Raptor', rarity: 'rare',      hp: 60,  atk: 13, def: 4, spd: 8, special: 'doubleSlash' },
  trike:  { name: 'Trike',  rarity: 'epic',      hp: 90,  atk: 10, def: 9, spd: 3, special: 'hornCharge' },
  rex:    { name: 'T-Rex',  rarity: 'legendary', hp: 72,  atk: 13, def: 4, spd: 3, special: 'crushingBite' },
  pachy:  { name: 'Pachy',  rarity: 'common',    hp: 48,  atk: 10, def: 4, spd: 5, special: 'skullBash' },
  sarco:  { name: 'Sarco',  rarity: 'rare',      hp: 62,  atk: 11, def: 5, spd: 6, special: 'deathRoll' },
  spino:  { name: 'Spino',  rarity: 'epic',      hp: 70,  atk: 15, def: 4, spd: 5, special: 'swampSurge' }
};

export const HATCHABLE = Object.keys(SPECIES).filter((id) => !SPECIES[id].enemyOnly);
