import { choose } from './popup.js';

// End-of-run stats (RunEnd and Fossil screens), from run.stats (tallied in systems/battleState.js).
//   bar_crit / bar_good / bar_miss   attack bars by result
//   ring_dodge / ring_block / ring_hit   defend presses by timing (before red / purple rings
//                                        or Brace change what they did)
//   dmgDealt, dmgTaken, bestHit, fights, streaks
//   combo2 / combo3 / combo4   attack bar combos by passes landed (systems/combo.js)
export function runStatLines(run) {
  const n = (k) => run.stats?.[k] ?? 0;
  const bars = n('bar_crit') + n('bar_good') + n('bar_miss'), rings = n('ring_dodge') + n('ring_block') + n('ring_hit');
  const missed = n('bar_miss') + n('ring_hit'), all = bars + rings;
  return [
    `FIGHTS WON ${n('fights')}`,
    `ATTACKS: ${n('bar_crit')} CRIT  ${n('bar_good')} GOOD  ${n('bar_miss')} MISS`,
    `DEFENDS: ${n('ring_dodge')} DODGE  ${n('ring_block')} BLOCK  ${n('ring_hit')} HIT`,
    `QTES MISSED: ${missed} OF ${all}${all ? ` (${Math.round((missed / all) * 100)}%)` : ''}`,
    `DAMAGE: ${n('dmgDealt')} DEALT  ${n('dmgTaken')} TAKEN`,
    `BIGGEST HIT: ${n('bestHit')}`,
    `CRIT STREAKS: ${n('streaks')}`,
    `COMBOS: ${n('combo2')} 2-PASS  ${n('combo3')} 3-PASS${n('combo4') ? `  ${n('combo4')} 4-PASS` : ''}`
  ];
}

export const showRunStats = (scene, run) =>
  choose(scene, { title: 'RUN STATS', lines: runStatLines(run), options: [{ label: 'CONTINUE' }] });
