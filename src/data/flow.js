// Perfect Moments (primal surge brief v2.5 §2b): the small reward for every perfect dodge
// and every crit. Tension -> calm -> release. Times are real milliseconds.

export const FLOW = {
  // Perfect dodge on the last hit of an attack: the world slows and goes quiet...
  slow: 0.2,            // time scale during the calm and the aim
  calmMs: 350,
  shortCalmMs: 150,     // from the 3rd perfect dodge in one enemy phase (combos don't drag)
  shortAfter: 3,
  dim: 0.38,            // darkening over everything but the player's dino
  // ...then the player aims the counter at a weak point...
  aimMs: 600,           // auto-picks the head when it runs out
  // ...and it fires very fast.
  hitstopMs: 90,
  dashMs: 70,           // 2-frame dash in, zip back home
  backMs: 120,
  // Crit on the attack bar: a freeze, then the attack plays fast.
  critFreezeMs: 150,
  critSpeed: 1.6,
  comboSpeed: 1.3,     // an attack bar combo of 2 passes swings this fast; 3 and up at comboBigSpeed
  comboBigSpeed: 1.6,
  // Music under a calm: ducked and muffled (systems/music.js calm()).
  musicLevel: 0.25,
  musicLowpass: 900
};

// Weak points on the attacker, placed on its sprite grid (0-1 of width / height, the head
// side is the front). head: the counter crits; legs: HOBBLED (ATK down for its next turn);
// tail: BLEED (dmg per turn for turns).
export const WEAK_POINTS = {
  head: { gx: 0.82, gy: 0.28, label: 'CRIT', color: 0xfff096 },
  legs: { gx: 0.5, gy: 0.92, label: 'HOBBLE', color: 0x7fe0ff, turns: 2 },
  tail: { gx: 0.1, gy: 0.5, label: 'BLEED', color: 0xe43b44, dmg: 2, turns: 2 }
};
export const POINT_ORDER = ['tail', 'legs', 'head']; // left to right for a right-facing dino

// The streak aura: grows with consecutive perfects, fades with a sigh when broken.
//   shimmer from 1, foot flames from 3, full aura + a soft light from 5
export const AURA = {
  shimmer: 1, flames: 3, full: 5,
  colors: [0xfff096, 0xfeae34, 0xf77622],
  light: { radius: 70, color: 0xffb040, intensity: 0.9 }
};

// Streak chimes climb a pentatonic scale in the current track's key.
export const PENTA = { major: [0, 2, 4, 7, 9], minor: [0, 3, 5, 7, 10] };
