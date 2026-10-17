// Traits. One is spun at hatch. `short` shows on the battle HUD.
export const TRAITS = {
  thickHide:     { name: 'Thick Hide',     short: 'HIDE',    desc: '-15% DAMAGE TAKEN' },
  venomBite:     { name: 'Venom Bite',     short: 'VENOM',   desc: 'HITS POISON 3/TURN' },
  bloodlust:     { name: 'Bloodlust',      short: 'BLOOD',   desc: 'HEAL 20% ON KILL' },
  quickReflexes: { name: 'Quick Reflexes', short: 'REFLEX',  desc: '+40% DODGE WINDOW' },
  packInstinct:  { name: 'Pack Instinct',  short: 'PACK',    desc: '+20% ATK BELOW HALF HP' },
  thunderRoar:   { name: 'Thunder Roar',   short: 'THUNDER', desc: 'ROAR MAY STUN (25%)' }
};

export const TRAIT_TUNING = {
  thickHide: 0.85,     // damage taken multiplier
  venomDmg: 3,         // poison damage per turn
  venomTurns: 3,
  bloodlust: 0.2,      // fraction of max HP healed on a kill
  reflexMult: 1.4,     // dodge window multiplier
  packMult: 1.2,       // ATK multiplier below 50% HP
  stunChance: 0.25     // Thunder Roar stun chance
};
