import { makeRng } from '../systems/rng.js';
import { SPECIES } from '../data/species.js';
import { ZONES } from '../data/zones.js';

// A run as plain JSON and back. The RNG is stored as its seed + current state,
// so nothing re-rolls after a reload. No Phaser here (the sim round-trips runs too).
export const RUN_VERSION = 1;

export function serializeRun(run) {
  const { rng, ...rest } = run;
  return { ...JSON.parse(JSON.stringify(rest)), rng: { seed: rng.seed, state: rng.state() } };
}

// Throws on data that can't make a playable run.
export function deserializeRun(data) {
  const run = JSON.parse(JSON.stringify(data));
  const ok = run?.rng && Number.isFinite(run.rng.state) && SPECIES[run.dino?.species] && ZONES[run.zone]
    && Array.isArray(run.zones) && run.map?.nodes && Array.isArray(run.relics);
  if (!ok) throw new Error('bad run');
  for (const z of run.zones) if (!ZONES[z]) throw new Error(`unknown zone ${z}`);
  run.rng = makeRng(data.rng.seed, data.rng.state);
  return run;
}

// Bring an older run save up to RUN_VERSION (none yet). Throws if it can't.
export function migrateRun(rec) {
  if (!rec || typeof rec !== 'object' || !rec.snap || !rec.phase) throw new Error('bad save');
  if ((rec.v ?? 0) > RUN_VERSION || (rec.v ?? 0) < 1) throw new Error(`run save v${rec.v}`);
  return rec;
}
