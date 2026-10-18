import { RELICS } from '../data/relics.js';
import { MUTATIONS } from '../data/mutations.js';
import { GOALS } from '../data/goals.js';
import { heirOptions, dinoName } from '../run/run.js';
import { checkGoals, rewardText } from '../systems/goals.js';
import { sfx } from '../systems/sfx.js';
import { choose } from './popup.js';
import { makeRng } from '../systems/rng.js';

// End-of-run popups shared by the Fossil (death) and RunEnd (victory) screens.

// The dino picks 1 of its fossils or mutations for its heir to start with.
// Returns { kind, id, move?, name, from } or null.
export async function pickHeir(scene, run) {
  const all = heirOptions(run);
  if (!all.length) {
    await choose(scene, { title: 'BLOODLINE', lines: ['NO FOSSILS OR MUTATIONS', 'TO PASS ON.'], options: [{ label: 'CONTINUE' }] });
    return null;
  }
  const rng = makeRng((run.seed ^ 0x5eed) >>> 0); // seeded by the run: a reload shows the same offers
  for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(rng.next() * (i + 1)); [all[i], all[j]] = [all[j], all[i]]; }
  const offers = all.slice(0, 5);
  const options = offers.map((o) => ({
    label: o.name.toUpperCase(),
    sub: o.kind === 'relic' ? RELICS[o.id].desc : `MUTATION: ${MUTATIONS[o.move][o.id].info}`
  }));
  const i = await choose(scene, { title: 'BLOODLINE', lines: ['YOUR NEXT HATCHLING INHERITS:'], options, bh: 24 });
  sfx('levelup');
  return { ...offers[i], from: dinoName(run.dino) };
}

// Final goal check for the run; shows what was completed.
export async function endGoals(scene, run, won) {
  const ids = checkGoals(run, [{ type: 'end', won }]);
  await showGoals(scene, ids);
}

export async function showGoals(scene, ids) {
  if (!ids.length) return;
  sfx('ding');
  const lines = ids.slice(0, 6).flatMap((id) => [GOALS[id].name.toUpperCase(), `  ${rewardText(GOALS[id].reward)}`]);
  await choose(scene, { title: ids.length > 1 ? 'GOALS COMPLETE!' : 'GOAL COMPLETE!', lines, options: [{ label: 'NICE' }] });
}
