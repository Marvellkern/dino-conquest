// Moves. `anim` picks the animation set (see battle/anims.js).
// power: multiplier on ATK. hits: number of strikes, each with its own QTE.
// Swarm is one QTE that lands 3 hits (see battle/anims.js).
// sure: can't miss (attack QTE miss counts as GOOD, defender can only block).
export const MOVES = {
  bite:         { name: 'Bite',          label: 'BITE',       desc: 'ATTACK',     power: 1.0, anim: 'bite' },
  tail:         { name: 'Tail Whip',     label: 'TAIL WHIP',  desc: 'SURE HIT',   power: 0.7, anim: 'tail', sure: true },
  roar:         { name: 'Roar',          label: 'ROAR',       desc: 'ATK DOWN',   status: true, cooldown: 3,
                  effect: { stat: 'atkDown', turns: 2 } },
  crushingBite: { name: 'Crushing Bite', label: 'CRUSH BITE', desc: 'PIERCE DEF', power: 1.5, anim: 'bigBite', cooldown: 3, defIgnore: 0.3 },
  doubleSlash:  { name: 'Double Slash',  label: 'DBL SLASH',  desc: '2 HITS',     power: 0.75, anim: 'bite', cooldown: 3, hits: 2 },
  swarm:        { name: 'Swarm',         label: 'SWARM',      desc: '3 HITS',     power: 0.45, anim: 'swarm', cooldown: 3 },
  hornCharge:   { name: 'Horn Charge',   label: 'HORN RAM',   desc: 'DEF UP',     power: 1.5, anim: 'charge', cooldown: 3,
                  self: { stat: 'defUp', turns: 2 } },
  // Boss only: spends a turn charging, then lands with a much tighter dodge window.
  primalChomp:  { name: 'Primal Chomp',  label: 'PRIMAL',     desc: 'CHARGES',    power: 2.2, anim: 'bigBite', cooldown: 4, defIgnore: 0.3,
                  charge: true, tight: 0.55 },
  // Swamp enemies.
  skullBash:    { name: 'Skull Bash',    label: 'SKULL BASH', desc: 'PIERCE DEF', power: 1.4, anim: 'charge', cooldown: 3, defIgnore: 0.5 },
  deathRoll:    { name: 'Death Roll',    label: 'DEATH ROLL', desc: '3 BITES',    power: 0.55, anim: 'bite', cooldown: 3, hits: 3 },
  swampSurge:   { name: 'Swamp Surge',   label: 'SURGE',      desc: 'CHARGES',    power: 2.0, anim: 'charge', cooldown: 4, defIgnore: 0.3,
                  charge: true, tight: 0.6 }
};
for (const [id, m] of Object.entries(MOVES)) m.id = id;

// Move upgrades (Fossil Dig / evolution): +power per level, Roar lasts longer.
export const MOVE_UP = { power: 0.25, statusTurns: 1, max: 2 };

// Global damage tuning: dmg = ATK * power * scale * defK / (defK + DEF).
export const DAMAGE = { scale: 1.4, defK: 10 };

// Status effect sizes.
export const STATUS = { atkDownMult: 0.75, defUpAmount: 2 };

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
