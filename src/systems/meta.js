import { load, save, wipe, defaultSave } from './save.js';
import { setSfx } from './sfx.js';
import { bonusOf } from '../data/lineage.js';

// Meta progression (Amber, fossils, lineage, Dino-dex, settings), loaded once
// at startup and written back with persist() after every change.
export const meta = load();
export const persist = () => save(meta);

// Spinning a species reveals it in the Dino-dex.
export function markHatched(species) {
  const e = (meta.dex[species] ??= { hatched: 0, best: 0 });
  e.hatched++;
  persist();
}

// End of a run: bank Amber (with Amber Nose), record best level. Returns Amber banked.
export function bankRun(run, won) {
  const amber = Math.round(run.amber * (1 + bonusOf(meta, 'amber')));
  meta.amber += amber;
  meta.stats.runs++;
  if (won) meta.stats.wins++;
  const e = (meta.dex[run.dino.species] ??= { hatched: 1, best: 0 });
  e.best = Math.max(e.best, run.dino.level);
  if (won) e.wins = (e.wins ?? 0) + 1; // crown in the Dino-dex
  persist();
  return amber;
}

// Push settings into the systems that use them (SFX module, shake flag).
export function applySettings(registry) {
  setSfx(meta.settings.sfx);
  registry.set('shake', meta.settings.shake);
}

// Erase everything and start from a fresh save (same object, so imports stay valid).
export function resetMeta() {
  wipe();
  for (const k of Object.keys(meta)) delete meta[k];
  Object.assign(meta, defaultSave());
  persist();
}

export function addFossil(record) {
  meta.fossils.push(record);
  if (meta.fossils.length > 50) meta.fossils.shift();
  persist();
}
