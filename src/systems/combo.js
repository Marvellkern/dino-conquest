// Attack bar combo passes (attack combo brief v2.7, numbers in data/moves.js COMBO).
// Phaser-free, so the sim uses the same rules. The first pass is the normal attack bar;
// after a good or crit the marker bounces back for an optional, faster extra pass with
// new, smaller zones, then once more. A miss or no tap ends the combo and keeps what
// was earned. Crits (x1.75, the streak) only come from the first pass.
import { MOVES, QTE_MULT, COMBO, COMBO_MULT } from '../data/moves.js';
import { RELIC_TUNING as RT } from '../data/relics.js';
import { has, moveHits } from './build.js';
import * as SG from './surge.js';

// Single-hit attacks only: multi-hit and spread specials, Roar, Brace, counters and the
// Apex Strike keep their own timing.
export function comboEligible(st, id) {
  const m = MOVES[id];
  return !!m && !m.status && !m.brace && !m.spread && id !== 'counter' && id !== 'apex' && moveHits(st, m) === 1;
}

// The extra passes for this fight's build: passes in total (first included), and each
// extra pass's speed and zone size against the first.
export function comboPlan(st) {
  const passes = has(st, 'fourthStrike') ? RT.fourthPasses : 3;
  const up = has(st, 'rhythmBone') ? RT.rhythmSpeedUp : COMBO.speedUp;
  return {
    passes,
    pass: (k) => ({ speed: (1 + up) ** k, shrink: COMBO.shrink ** k }), // k: 1 = the first extra pass
    bounceMs: COMBO.bounceMs, lead: COMBO.lead, minWinMs: COMBO.minWinMs
  };
}

// The damage multiplier for a combo. qte: the first pass. landed: passes hit (first
// included). sweets: extra passes that hit the sweet spot. Capped together with the QTE.
export function comboMult(qte, landed, sweets = 0) {
  if (qte === 'miss' || landed <= 1) return 1;
  const raw = COMBO_MULT[Math.min(landed, COMBO_MULT.length) - 1] + COMBO.sweetBonus * sweets;
  return Math.min(raw, COMBO.cap / QTE_MULT[qte]);
}

// A combo ended: run stats for the goals and the summary, and +meter per extra pass
// (gain: the battle scene's meter, so it shows its "+5"). Returns the meter gained.
export function noteCombo(st, qte, landed, sweets = 0, gain = (k) => SG.gain(st, k)) {
  const s = st.build.run?.stats;
  if (s && landed >= 2) s[`combo${landed}`] = (s[`combo${landed}`] ?? 0) + 1;
  if (s && landed >= 3 && qte === 'crit' && sweets === landed - 1) s.comboPerfect = (s.comboPerfect ?? 0) + 1; // Perfect Rhythm
  let gained = 0;
  for (let i = 1; i < landed; i++) gained += gain('combo') ?? 0;
  return gained;
}
