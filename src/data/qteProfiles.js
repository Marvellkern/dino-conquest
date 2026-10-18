// Defend-ring timing (QTE rework, phase 1). Every enemy attack has a timing
// profile (brains.js `profiles`), rolled fresh each time with the battle's
// seeded RNG, so the same enemy never attacks on the exact same beat twice.
// The attack animation and the ring both follow the profile, so it's readable:
//   tell   wind-up length range (ms) before the strike
//   ease   ring shrink curve: linear | in (slow, then fast) | out (fast, then slow)
//   pause  the wind-up freezes for this long partway through (the ring stops too)
//   feint  a fake wind-up first; the ring restarts (pressing during it is TOO EARLY)
//   gaps   follow-up hits of a multi-hit attack come after an uneven gap
export const PROFILES = {
  steady: { tell: [450, 650], ease: 'linear' },
  lunge: { tell: [500, 750], ease: 'in' },
  snap: { tell: [350, 550], ease: 'out' },
  delay: { tell: [420, 560], ease: 'linear', pause: [150, 300] },
  feint: { tell: [420, 580], ease: 'linear', feint: true },
  combo: { tell: [420, 580], ease: 'linear', gaps: [250, 550] }
};

export const FEINT_MS = 380; // length of the fake-out
export const PAUSE_AT = 0.55; // where in the wind-up a `delay` freezes

// Dodge / block windows (±ms) per zone, and how often an attack gets a red
// (can't dodge: perfect only blocks) or purple (can't block: only a perfect
// dodge avoids it) ring. Bosses use at least `bossRings`.
// Attack bar per zone: sweet / good zone widths (px of 100), the chance a
// bar's marker moves on an eased curve, and the chance its sweet spot drifts.
export const ZONE_TIMING = {
  jungle: { dodgeMs: 85, blockMs: 195, rings: 0, sweetW: 8, goodW: 30, curved: 0.2, drift: 0 },
  swamp: { dodgeMs: 72, blockMs: 210, rings: 0.35, sweetW: 7, goodW: 28, curved: 0.35, drift: 0 },
  volcano: { dodgeMs: 62, blockMs: 190, rings: 0.4, sweetW: 6, goodW: 26, curved: 0.45, drift: 0.3 },
  coast: { dodgeMs: 57, blockMs: 185, rings: 0.42, sweetW: 6, goodW: 25, curved: 0.5, drift: 0.3 },
  crater: { dodgeMs: 52, blockMs: 180, rings: 0.45, sweetW: 5, goodW: 24, curved: 0.55, drift: 0.3 }
};
export const SWEEP_MS = [650, 950]; // each bar rolls its sweep time
export const SWEET_AT = [0.2, 0.85]; // sweet spot center range along the bar
export const MIN_SWEET_W = 3;
export const BOSS_RINGS = 0.35;
// Share of flagged attacks that are red (block only); the rest are purple (dodge only).
// Red-heavy on purpose: it costs perfect-dodgers more than it costs blockers.
export const RED_SHARE = 0.85;

// Dodge fatigue: each perfect dodge in a row shrinks the next dodge window.
export const FATIGUE = { step: 0.8, floor: 0.4 };
export const fatigueMult = (n) => Math.max(FATIGUE.floor, FATIGUE.step ** n);
export const EXT_DODGE_MS = 3; // each Extinction level tightens the dodge window
export const MIN_DODGE_MS = 40; // never tighter than this (touch latency)

export function zoneTiming(zone, ext = 0) {
  const z = ZONE_TIMING[zone] ?? ZONE_TIMING.jungle;
  return {
    dodgeMs: Math.max(MIN_DODGE_MS, z.dodgeMs - EXT_DODGE_MS * ext), blockMs: z.blockMs, rings: z.rings, redShare: RED_SHARE,
    // Extinction: the sweet spot loses 1px every 2 levels.
    bar: { sweetW: Math.max(MIN_SWEET_W, z.sweetW - Math.floor(ext / 2)), goodW: z.goodW, curved: z.curved, drift: z.drift }
  };
}

// One attack bar's shape, rolled with the battle's seeded RNG.
//   sweepMs: marker travel time; center: sweet spot (0..1); curve: linear |
//   wave (speeds up and slows down) | ease (slow-fast-slow); drift: sweet spot sways.
export function rollBar(rng, bar) {
  const pick = (r) => r[0] + rng.next() * (r[1] - r[0]);
  const curved = rng.next() < bar.curved;
  return {
    sweepMs: Math.round(pick(SWEEP_MS)), center: pick(SWEET_AT),
    curve: curved ? (rng.next() < 0.5 ? 'wave' : 'ease') : 'linear',
    drift: rng.next() < bar.drift ? { amp: 0.08 + rng.next() * 0.06, period: 900 + rng.next() * 600, phase: rng.next() * Math.PI * 2 } : null,
    sweetW: bar.sweetW, goodW: bar.goodW
  };
}

const roll = (rng, [a, b]) => Math.round(a + rng.next() * (b - a));

// Concrete timing for one hit. hit: index within a multi-hit attack.
export function rollTiming(rng, name, hit = 0) {
  const p = PROFILES[name] ?? PROFILES.steady;
  const tell = hit > 0 ? roll(rng, p.gaps ?? [280, 320]) : roll(rng, p.tell);
  const out = { profile: name, tell, ease: hit > 0 ? 'linear' : p.ease, pause: 0, pauseAt: 0, feint: hit === 0 && !!p.feint };
  if (p.pause && hit === 0) { out.pause = roll(rng, p.pause); out.pauseAt = Math.round((tell - out.pause) * PAUSE_AT); }
  return out;
}
