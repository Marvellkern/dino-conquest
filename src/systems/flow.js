// Perfect Moments rules (data/flow.js): the perfect streak and the aimed counter. Phaser-free.
import { WEAK_POINTS } from '../data/flow.js';
import { counterStrike } from './battleState.js';

// Consecutive perfects (perfect dodges and crits). A hit taken or a missed attack breaks it.
export function perfect(st) {
  st.flowStreak = (st.flowStreak ?? 0) + 1;
  return st.flowStreak;
}
export function breakStreak(st) {
  const was = st.flowStreak ?? 0;
  st.flowStreak = 0;
  return was;
}

// The perfect-dodge counter aimed at a weak point: head crits, legs hobble (ATK down for
// the target's next turn), tail bleeds. Same damage rules as the plain counter otherwise.
export function aimedCounter(st, target, point = 'head') {
  const r = counterStrike(st, target, point === 'head' ? 'crit' : 'good');
  r.point = point;
  if (target.hp > 0 && point === 'legs') target.status.atkDown = Math.max(target.status.atkDown, WEAK_POINTS.legs.turns);
  if (target.hp > 0 && point === 'tail') {
    target.status.bleed = Math.max(target.status.bleed, WEAK_POINTS.tail.turns);
    target.bleedDmg = WEAK_POINTS.tail.dmg;
  }
  return r;
}
