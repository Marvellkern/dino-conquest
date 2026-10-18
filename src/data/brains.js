// Enemy behaviour. Each brain cycles through tokens, one per enemy action:
//   '<moveId>'        attack with that move (multi-hit if the move has hits > 1)
//   'feint'           a Bite with a fake wind-up (pressing early is punished)
//   'charge:<moveId>' spend the action charging; the NEXT action is that move
//   'defend'          take half damage until its next action
//   'roar'            lower the player's ATK
//   'submerge'        dive: untargetable, next action is an Ambush (tight ring)
//   'flood'           muddy the player's next attack bar unless they braced
//   'bask'            heal 20% of max HP (Dimetrodon soaking up heat)
//   'spikes'          guard, and hitting it while guarded pricks the attacker (30%)
//   ambush: the move a surfacing enemy uses (default 'ambush').
//   lowWater: '<moveId>': takes less damage except when that move is its intent (Plesiosaur).
//   noPounce: evades missed attacks (evadeMiss) without pouncing back (Ichthyosaur).
// Options: armorCharging (half damage while charging), evadeMiss (a missed
// attack QTE is evaded and answered with a free Pounce), phase2 (from 50% HP).
// profiles: defend-ring timing per move (data/qteProfiles.js); a list picks one
// at random each time. Moves not listed use 'steady'.
export const BRAINS = {
  compy:  { cycle: ['bite', 'nip', 'tail'], profiles: { bite: 'steady', nip: 'combo', tail: 'snap' } },
  raptor: { cycle: ['bite', 'feint'], evadeMiss: true, profiles: { bite: ['snap', 'steady'], pounce: 'snap' } },
  trike:  { cycle: ['bite', 'bite', 'charge:hornRam'], armorCharging: true, profiles: { bite: ['steady', 'snap'], hornRam: 'lunge' } },
  pachy:  { cycle: ['headbutt', 'headbutt', 'defend'], profiles: { headbutt: ['steady', 'delay', 'lunge'] } },
  sarco:  { cycle: ['bite', 'deathRoll', 'submerge'], profiles: { bite: 'steady', deathRoll: 'combo', ambush: 'delay' } },
  ankylo: { cycle: ['bite', 'defend', 'charge:clubSwing'], armorCharging: true, profiles: { bite: ['steady', 'delay'], clubSwing: 'lunge' } },
  ptera:  { cycle: ['dive', 'bite'], evadeMiss: true, profiles: { dive: ['snap', 'feint'], bite: 'snap', pounce: 'snap' } },
  dimetro: { cycle: ['bite', 'bask', 'bite'], profiles: { bite: ['steady', 'delay'] } },
  stego:  { cycle: ['bite', 'spikes', 'tail'], profiles: { bite: ['steady', 'lunge'], tail: ['snap', 'delay'] } },
  // Carno: a regular enemy that enrages at half HP.
  carno:  { cycle: ['bite', 'bite', 'charge:goreCharge'], phase2: { cycle: ['bite', 'charge:goreCharge'], tellMult: 0.8, line: 'THE CARNO RAGES!' },
    profiles: { bite: ['snap', 'delay', 'feint'], goreCharge: 'lunge' } },

  // Tidal Coast.
  dilo:   { cycle: ['bite', 'spitBlind', 'bite'], profiles: { bite: ['snap', 'steady'], spitBlind: ['steady', 'delay'] } },
  plesio: { cycle: ['bite', 'bite', 'tideLunge'], lowWater: 'tideLunge', profiles: { bite: ['steady', 'delay'], tideLunge: 'lunge' } },
  ichthy: { cycle: ['finFlurry', 'bite'], evadeMiss: true, noPounce: true, profiles: { finFlurry: 'combo', bite: ['snap', 'combo'] } },
  bary:   { cycle: ['bite', 'fishHook', 'bite'], profiles: { bite: ['steady', 'snap'], fishHook: ['lunge', 'delay'] } },

  alphaRex: {
    profiles: { bite: ['steady', 'snap', 'delay'], primalChomp: ['lunge', 'feint'], tail: 'snap' },
    cycle: ['bite', 'roar', 'charge:primalChomp'],
    phase2: { cycle: ['bite', 'charge:primalChomp', 'tail'], summon: 'compy', tellMult: 0.7, line: 'ALPHA REX ENRAGES!' }
  },
  bogSpino: {
    profiles: { bite: ['steady', 'delay', 'snap'], deathRoll: 'combo', bogSurge: ['lunge', 'delay'] },
    cycle: ['bite', 'deathRoll', 'flood'],
    phase2: { cycle: ['flood', 'charge:bogSurge', 'bite'], tellMult: 0.8, line: 'THE BOG RISES!' }
  },
  cinderStego: {
    profiles: { bite: ['snap', 'delay', 'lunge'], magmaTail: ['lunge', 'feint'], tail: ['snap', 'delay'] },
    cycle: ['bite', 'spikes', 'charge:magmaTail'],
    phase2: { cycle: ['charge:magmaTail', 'spikes', 'bite'], summon: 'ptera', tellMult: 0.75, line: 'THE VOLCANO ERUPTS!' }
  },
  // Phase 2: dives every other turn (untargetable) and surfaces with an unblockable Breach.
  abyssMosa: {
    profiles: { deepBite: ['lunge', 'delay'], undertow: ['steady', 'snap'], breach: 'delay' },
    cycle: ['deepBite', 'undertow'], ambush: 'breach',
    phase2: { cycle: ['submerge', 'deepBite', 'undertow'], summon: 'ichthy', tellMult: 0.75, line: 'THE TIDE RISES!' }
  },
  meteorTitan: {
    profiles: { bite: ['snap', 'delay', 'feint'], starfall: ['lunge', 'delay', 'feint'] },
    cycle: ['bite', 'roar', 'charge:starfall'],
    phase2: { cycle: ['starfall', 'bite', 'charge:starfall'], summon: 'raptor', tellMult: 0.65, line: 'THE METEOR FALLS!' }
  }
};

export const DEFAULT_BRAIN = { cycle: ['bite', 'bite', 'tail'] };

// Intent icon + short label for each intent kind (icons live in sprites/icons.js).
export const INTENT_ICONS = {
  attack: 'int_attack', multi: 'int_attack', charge: 'int_charge', defend: 'int_defend',
  debuff: 'int_debuff', stunned: 'int_stun', submerge: 'int_submerge', ambush: 'int_submerge',
  flood: 'int_flood', heal: 'int_heal', spikes: 'int_spikes'
};

// Gimmick moves get their own intent icon, so what's coming is readable.
export const MOVE_INTENT_ICONS = { spitBlind: 'int_blind', fishHook: 'int_hook', undertow: 'int_undertow' };

// Ring flags: red = can't dodge (a perfect press only blocks), purple = can't block.
export const RING_ICONS = { red: 'int_ring_red', purple: 'int_ring_purple' };
export const RING_COLORS = { red: 0xff4040, purple: 0xc070ff };

// When a boss hits phase 2.
export const PHASE2_AT = 0.5;
