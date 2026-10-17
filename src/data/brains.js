// Enemy behaviour. Each brain cycles through tokens, one per enemy action:
//   '<moveId>'        attack with that move (multi-hit if the move has hits > 1)
//   'feint'           a Bite with a fake wind-up (pressing early is punished)
//   'charge:<moveId>' spend the action charging; the NEXT action is that move
//   'defend'          take half damage until its next action
//   'roar'            lower the player's ATK
//   'submerge'        dive: untargetable, next action is an Ambush (tight ring)
//   'flood'           muddy the player's next attack bar unless they braced
// Options: armorCharging (half damage while charging), evadeMiss (a missed
// attack QTE is evaded and answered with a free Pounce), phase2 (from 50% HP).
export const BRAINS = {
  compy:  { cycle: ['bite', 'bite', 'tail'] },
  raptor: { cycle: ['bite', 'feint'], evadeMiss: true },
  trike:  { cycle: ['bite', 'bite', 'charge:hornRam'], armorCharging: true },
  pachy:  { cycle: ['headbutt', 'headbutt', 'defend'] },
  sarco:  { cycle: ['bite', 'deathRoll', 'submerge'] },

  alphaRex: {
    cycle: ['bite', 'roar', 'charge:primalChomp'],
    phase2: { cycle: ['bite', 'charge:primalChomp', 'tail'], summon: 'compy', tellMult: 0.7, line: 'ALPHA REX ENRAGES!' }
  },
  bogSpino: {
    cycle: ['bite', 'deathRoll', 'flood'],
    phase2: { cycle: ['flood', 'charge:bogSurge', 'bite'], tellMult: 0.8, line: 'THE BOG RISES!' }
  }
};

export const DEFAULT_BRAIN = { cycle: ['bite', 'bite', 'tail'] };

// Intent icon + short label for each intent kind (icons live in sprites/icons.js).
export const INTENT_ICONS = {
  attack: 'int_attack', multi: 'int_attack', charge: 'int_charge', defend: 'int_defend',
  debuff: 'int_debuff', stunned: 'int_stun', submerge: 'int_submerge', ambush: 'int_submerge',
  flood: 'int_flood'
};

// When a boss hits phase 2.
export const PHASE2_AT = 0.5;
