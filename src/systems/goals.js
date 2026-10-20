import { GOALS, GOAL_ORDER } from '../data/goals.js';
import { AMB } from '../ui/amber.js';
import { RELICS } from '../data/relics.js';
import { MUTATIONS } from '../data/mutations.js';
import { meta, persist } from './meta.js';

// Checks goals against what just happened (see data/goals.js) and pays out the
// rewards. Returns the goals completed by these events.
export function checkGoals(run, events) {
  const done = [];
  for (const id of GOAL_ORDER) {
    if (meta.goals[id]) continue;
    if (!events.some((ev) => safeTest(GOALS[id], ev, run))) continue;
    meta.goals[id] = true;
    grant(GOALS[id].reward);
    done.push(id);
  }
  if (done.length) persist();
  return done;
}

function safeTest(g, ev, run) {
  try { return !!g.test(ev, run, meta); } catch { return false; }
}

function grant(r) { // a reward can carry several things (Amber and a fossil)
  if (r.amber) meta.amber += r.amber;
  if (r.relic) meta.unlocks[`relic:${r.relic}`] = 1;
  if (r.mutation) meta.unlocks[`mut:${r.mutation}`] = 1;
  if (r.unlock) meta.unlocks[r.unlock] = 1;
}

export function rewardText(r) {
  if (r.amber && (r.relic || r.mutation || r.unlock)) return `+${r.amber}${AMB} + ${rewardText({ ...r, amber: 0 })}`;
  if (r.amber) return `+${r.amber}${AMB}`;
  if (r.relic) return `FOSSIL: ${RELICS[r.relic].name.toUpperCase()}`;
  if (r.mutation) { const [mv, id] = r.mutation.split(':'); return `MUTATION: ${MUTATIONS[mv][id].name.toUpperCase()}`; }
  return r.label;
}

export const goalsDone = () => GOAL_ORDER.filter((id) => meta.goals[id]).length;

// Short lines for end-of-fight / end-of-run banners.
export const goalLines = (ids) => ids.map((id) => `GOAL: ${GOALS[id].name.toUpperCase()}!`);
