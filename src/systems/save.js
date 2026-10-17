// Versioned localStorage save. Every access is wrapped: private windows,
// blocked storage or corrupt JSON fall back to a fresh save, never a crash.
const KEY = 'dino-conquest:save';
export const SAVE_VERSION = 1;

export const defaultSave = () => ({
  v: SAVE_VERSION,
  amber: 30,
  fossils: [],      // [{ species, evo, level, zone, col, cause, at }]
  lineage: {},      // bonus id -> stacks
  dex: {},          // species -> { hatched, best }
  settings: { sfx: true, shake: true },
  stats: { runs: 0, wins: 0 }
});

// Bring older saves up to the current shape. v1 is the first version, so this
// just fills in anything missing from the defaults.
function migrate(data) {
  const base = defaultSave();
  return {
    ...base,
    ...data,
    v: SAVE_VERSION,
    settings: { ...base.settings, ...data.settings },
    stats: { ...base.stats, ...data.stats }
  };
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultSave();
    const data = JSON.parse(raw);
    return data && typeof data === 'object' ? migrate(data) : defaultSave();
  } catch {
    return defaultSave();
  }
}

export function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function wipe() {
  try { localStorage.removeItem(KEY); } catch { /* nothing to clear */ }
}
