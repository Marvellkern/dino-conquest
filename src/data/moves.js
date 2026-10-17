// Moves. `anim` picks the animation set (see battle/anims.js).
// power: multiplier on ATK. hits: strikes, each with its own QTE. cost: player energy.
// btn / desc: move button text (≤7 chars each). sure: can't miss (attack QTE miss
// counts as GOOD; the defender can only block). spread: one QTE whose hits are
// spread across enemies (Swarm). blockMult: damage taken on a block (default 0.5).
export const MOVES = {
  bite:         { name: 'Bite',          btn: 'BITE',    desc: 'ATTACK',   cost: 1, power: 1.0, anim: 'bite' },
  tail:         { name: 'Tail Whip',     btn: 'TAIL',    desc: 'SURE', cost: 1, power: 0.7, anim: 'tail', sure: true },
  roar:         { name: 'Roar',          btn: 'ROAR',    desc: 'ATK-ALL', cost: 1, status: true, effect: { stat: 'atkDown', turns: 2 } },
  brace:        { name: 'Brace',         btn: 'BRACE',   desc: 'NO MISS',  cost: 1, brace: true },

  // Species specials (the player's 5th button).
  crushingBite: { name: 'Crushing Bite', btn: 'CRUSH',   desc: 'PIERCE',   cost: 3, power: 2.0, anim: 'bigBite', defIgnore: 0.4 },
  doubleSlash:  { name: 'Double Slash',  btn: '2X CUT',  desc: '2 HITS',   cost: 2, power: 0.75, anim: 'bite', hits: 2 },
  swarm:        { name: 'Swarm',         btn: 'SWARM',   desc: 'SPREAD', cost: 2, power: 0.55, anim: 'swarm', spread: 3 },
  hornCharge:   { name: 'Horn Charge',   btn: 'HORN',    desc: 'DEF UP',   cost: 2, power: 1.4, anim: 'charge', self: { stat: 'defUp', turns: 2 } },
  skullBash:    { name: 'Skull Bash',    btn: 'SKULL',   desc: 'PIERCE',   cost: 2, power: 1.3, anim: 'charge', defIgnore: 0.5 },
  deathRoll:    { name: 'Death Roll',    btn: 'D.ROLL',  desc: '3 BITES',  cost: 2, power: 0.55, anim: 'bite', hits: 3 },
  swampSurge:   { name: 'Swamp Surge',   btn: 'SURGE',   desc: 'BIG HIT',  cost: 3, power: 1.6, anim: 'charge', defIgnore: 0.3 },

  // Enemy-only moves (picked by systems/brains.js).
  hornRam:      { name: 'Horn Ram',      power: 2.2, anim: 'charge', blockMult: 0.8 },
  headbutt:     { name: 'Headbutt',      power: 1.0, anim: 'bite', drain: 1 },
  ambush:       { name: 'Ambush',        power: 1.4, anim: 'bite', tight: 0.6 },
  pounce:       { name: 'Pounce',        power: 0.7, anim: 'bite' },
  primalChomp:  { name: 'Primal Chomp',  power: 2.2, anim: 'bigBite', defIgnore: 0.3, tight: 0.55 },
  bogSurge:     { name: 'Bog Surge',     power: 2.0, anim: 'charge', defIgnore: 0.3, tight: 0.6 },
  flood:        { name: 'Flood',         status: true },
  counter:      { name: 'Counter',       power: 0.5, anim: 'bite' } // perfect-dodge riposte
};
for (const [id, m] of Object.entries(MOVES)) m.id = id;

// Player energy: max, gained each turn, extra on turn 1 if faster than every enemy.
export const ENERGY = { max: 3, perTurn: 2, fastStart: 1 };

// 3 crits in a row empower the next attack.
export const STREAK = { need: 3, bonus: 0.5 };

// Flooded arena: the next attack bar's zones shrink unless the player braced.
export const MUDDY = { sweet: 0.5, good: 0.6 };

// Move upgrades (Fossil Dig / evolution): +power per level, Roar lasts longer.
export const MOVE_UP = { power: 0.25, statusTurns: 1, max: 2 };

// Global damage tuning: dmg = ATK * power * scale * defK / (defK + DEF).
export const DAMAGE = { scale: 1.4, defK: 10 };

// Status effect sizes. guardMult: damage taken while an enemy defends or charges.
export const STATUS = { atkDownMult: 0.75, defUpAmount: 2, guardMult: 0.5 };

// Damage multipliers from QTE results.
export const QTE_MULT = { crit: 1.75, good: 1, miss: 0.6 };
export const DEFEND_MULT = { dodge: 0, block: 0.5, hit: 1 };

// QTE timing / size tuning.
export const QTE = {
  sweepMs: 850,   // attack bar: marker travel time
  sweetW: 8,      // attack bar: crit zone width (px of 100)
  goodW: 30,      // attack bar: normal zone width
  dodgeMs: 85,    // defend ring: ± window for a dodge
  blockMs: 180,   // defend ring: ± window for a block
  tellMs: 520     // enemy "!" wind-up before its attack
};
