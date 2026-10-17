import { LINEAGE, lineageOffers, stacks } from '../data/lineage.js';
import { choose } from '../ui/popup.js';
import { meta, persist } from '../systems/meta.js';
import { sfx } from '../systems/sfx.js';

// Offer up to 3 Lineage bonuses and apply the pick. Returns the id, or null
// if every bonus is already maxed. Used by Fossil (death) and RunEnd (victory).
export async function pickLineage(scene, { title = 'LINEAGE BONUS', lines = ['YOUR NEXT DINOS INHERIT:'] } = {}) {
  const offers = lineageOffers(meta);
  if (!offers.length) return null;
  const options = offers.map((id) => ({
    label: `${LINEAGE[id].name} ${stacks(meta, id) + 1}/${LINEAGE[id].cap}`,
    sub: LINEAGE[id].desc
  }));
  const i = await choose(scene, { title, lines, options });
  meta.lineage[offers[i]] = stacks(meta, offers[i]) + 1;
  persist();
  sfx('levelup');
  return offers[i];
}
