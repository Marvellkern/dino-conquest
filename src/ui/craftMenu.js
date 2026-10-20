import { CRAFT } from '../data/gacha.js';
import { SPECIES } from '../data/species.js';
import { VARIANTS } from '../data/variants.js';
import { meta, persist } from '../systems/meta.js';
import { craft, parseEgg, collection, buyableVariants } from '../systems/gacha.js';
import { sfx } from '../systems/sfx.js';
import { choose } from './popup.js';
import { eggPicker } from './eggPicker.js';
import { checkGoals } from '../systems/goals.js';
import { showGoals } from './bloodline.js';

// The Daily Hatchery's DINOS screen: the dinos you own (start runs with them from the Hatch
// screen, as often as you like), and Bone Shards: 600 buy a variant you don't have yet for
// a dino you own.
const name = (k) => { const { species, variant } = parseEgg(k); return `${(SPECIES[species].short ?? SPECIES[species].name).toUpperCase()}${variant ? ` ${VARIANTS[variant].name}` : ''}`; };

export async function craftMenu(scene) {
  const g = meta.gacha;
  for (;;) {
    const mine = collection(g), buy = buyableVariants(g);
    const i = await choose(scene, {
      title: 'YOUR DINOS',
      lines: [`BONE SHARDS: ${g.shards}`, 'START RUNS WITH THEM FROM THE HATCH SCREEN.'],
      options: [
        { label: 'SEE THEM', sub: `${mine.length} (WITH VARIANTS)` },
        { label: 'BUY A VARIANT', sub: `${CRAFT.variant} SHARDS: A NEW LOOK FOR A DINO YOU OWN`, disabled: !buy.length ? (mine.length ? 'YOU HAVE THEM ALL' : 'PULL A DINO FIRST') : null },
        { label: 'BACK' }
      ]
    });
    if (i === 0) await eggPicker(scene, mine, { title: 'YOUR DINOS' });
    else if (i === 1) {
      const k = await eggPicker(scene, buy, { title: `BUY A VARIANT: ${CRAFT.variant} SHARDS` });
      if (!k) continue;
      const yes = await choose(scene, {
        title: `BUY ${name(k)}?`,
        lines: [VARIANTS[parseEgg(k).variant].desc, `${CRAFT.variant} OF YOUR ${g.shards} BONE SHARDS`],
        options: [{ label: 'CANCEL' }, { label: 'BUY IT', disabled: g.shards < CRAFT.variant ? 'NOT ENOUGH SHARDS' : null }]
      });
      if (yes !== 1 || craft(g, k).error) { if (yes === 1) sfx('deny'); continue; }
      persist();
      sfx('levelup');
      await choose(scene, { title: 'NEW VARIANT!', lines: [`${name(k)} IS YOURS.`], options: [{ label: 'NICE' }] });
      await showGoals(scene, checkGoals(null, [{ type: 'buy', key: k }])); // Collector, Rainbow Rex
    } else return;
  }
}
