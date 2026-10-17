import { RELICS } from '../data/relics.js';
import { MUTATIONS } from '../data/mutations.js';
import { relicOffers, addRelic, mutationOffer, addMutation } from '../run/run.js';
import { sfx } from '../systems/sfx.js';
import { choose } from './popup.js';

// Shared popups for picking build pieces (used by Battle, Map nodes and events).

// Pick 1 of 3 fossils. Returns the id, or null if none are left.
export async function pickRelic(scene, run, title = 'FOSSIL', lines = ['TAKE ONE:']) {
  const ids = relicOffers(run, 3);
  if (!ids.length) return null;
  const i = await choose(scene, { title, lines, options: ids.map((id) => ({ label: RELICS[id].name.toUpperCase(), sub: RELICS[id].desc })) });
  addRelic(run, ids[i]);
  sfx('levelup');
  return ids[i];
}

// Mutate one base move. keep: offer "KEEP IT". Returns the mutation name, or null.
export async function pickMutation(scene, run, { title = 'MUTATION', keep = true } = {}) {
  const offer = mutationOffer(run);
  if (!offer) return null;
  const opts = offer.options.map((id) => MUTATIONS[offer.move][id]);
  const options = opts.map((m) => ({ label: m.name.toUpperCase(), sub: m.info }));
  if (keep) options.push({ label: 'KEEP IT', sub: 'NO CHANGE' });
  const i = await choose(scene, { title, lines: [`MUTATE YOUR ${offer.move.toUpperCase()}?`], options });
  if (i >= opts.length) return null;
  addMutation(run, offer.move, offer.options[i]);
  sfx('levelup');
  return opts[i].name;
}
