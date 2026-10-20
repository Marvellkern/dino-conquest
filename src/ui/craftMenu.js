import { CRAFT } from '../data/gacha.js';
import { HATCHABLE, SPECIES } from '../data/species.js';
import { VARIANTS, VARIANT_ORDER } from '../data/variants.js';
import { meta, persist } from '../systems/meta.js';
import { craft, eggKey, parseEgg } from '../systems/gacha.js';
import { sfx } from '../systems/sfx.js';
import { choose } from './popup.js';
import { eggPicker } from './eggPicker.js';

// The Daily Hatchery's EGGS screen (gacha brief §4): your collection, and Bone Shard
// crafting. 100 shards make an egg of any species you've hatched or pulled; 300 make
// another egg of a variant you own.
const name = (k) => { const { species, variant } = parseEgg(k); return `${(SPECIES[species].short ?? SPECIES[species].name).toUpperCase()}${variant ? ` ${VARIANTS[variant].name}` : ''}`; };

export async function craftMenu(scene) {
  const g = meta.gacha;
  for (;;) {
    const known = HATCHABLE.filter((sp) => meta.dex[sp] || Object.keys(g.eggs).some((k) => parseEgg(k).species === sp) || g.variants[sp]);
    const variants = HATCHABLE.flatMap((sp) => VARIANT_ORDER.filter((v) => g.variants[sp]?.[v]).map((v) => eggKey(sp, v)));
    const eggs = Object.values(g.eggs).reduce((t, n) => t + n, 0);
    const i = await choose(scene, {
      title: 'EGGS',
      lines: [`BONE SHARDS: ${g.shards}`, 'EGGS START RUNS FROM THE HATCH SCREEN.'],
      options: [
        { label: 'YOUR EGGS', sub: `${eggs} EGG${eggs === 1 ? '' : 'S'}` },
        { label: 'CRAFT AN EGG', sub: `${CRAFT.species} SHARDS: A SPECIES YOU'VE MET`, disabled: !known.length ? 'HATCH OR PULL ONE FIRST' : null },
        { label: 'CRAFT A VARIANT EGG', sub: `${CRAFT.variant} SHARDS: A VARIANT YOU OWN`, disabled: !variants.length ? 'PULL A VARIANT FIRST' : null },
        { label: 'BACK' }
      ]
    });
    if (i === 0) await eggPicker(scene, g.eggs, { title: 'YOUR EGGS' });
    else if (i === 1 || i === 2) {
      const cost = i === 1 ? CRAFT.species : CRAFT.variant;
      const k = await eggPicker(scene, g.eggs, { title: `CRAFT: ${cost} SHARDS`, keys: i === 1 ? known : variants, badge: (key) => `X${g.eggs[key] ?? 0}` });
      if (!k) continue;
      const yes = await choose(scene, {
        title: `CRAFT ${name(k)}?`,
        lines: [`${cost} OF YOUR ${g.shards} BONE SHARDS`],
        options: [{ label: 'CANCEL' }, { label: 'CRAFT IT', disabled: g.shards < cost ? 'NOT ENOUGH SHARDS' : null }]
      });
      if (yes !== 1) continue;
      const r = craft(g, k, known);
      if (r.error) { sfx('deny'); continue; }
      persist();
      sfx('levelup');
      await choose(scene, { title: 'CRAFTED!', lines: [`AN EGG OF ${name(k)}`, 'IS IN YOUR COLLECTION.'], options: [{ label: 'NICE' }] });
    } else return;
  }
}
