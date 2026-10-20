// Versioned localStorage save. Every access is wrapped: private windows,
// blocked storage or corrupt JSON fall back to a fresh save, never a crash.
const KEY = 'dino-conquest:save';
export const SAVE_VERSION = 2;

// v1 Lineage stacks are refunded at this much Amber each when a save moves to v2.
export const LINEAGE_REFUND = 15;

export const defaultSave = () => ({
  v: SAVE_VERSION,
  amber: 30,
  fossils: [],      // ancestors: [{ gen, species, evo, level, zone, col, cause, won, ext, inherited, passed, at }]
  dex: {},          // species -> { hatched, best, wins, ext }
  unlocks: {},      // Nest unlock id / goal reward key -> level owned
  goals: {},        // goal id -> true
  heir: null,       // { kind: 'relic' | 'mutation', id, move?, from } carried into the next hatchling
  ext: { sel: 0, best: 0 }, // chosen Extinction level, highest cleared
  settings: { sfx: true, shake: true, gfx: 'auto', music: 60, sfxVol: 100 }, // gfx: auto | low | medium | high (gfxAuto: Auto's remembered tier); sfx: the Sound toggle; music / sfxVol: 0-100
  stats: { runs: 0, wins: 0, gens: 0 },
  notice: null      // one-time message for the Nest (the v2 upgrade)
});

// Bring older saves up to the current shape.
// v1 → v2: Lineage stat bonuses become Amber; the Dino-dex and past fossils stay
// (fossils become the family tree).
function migrate(data) {
  const base = defaultSave();
  const out = {
    ...base,
    ...data,
    v: SAVE_VERSION,
    settings: { ...base.settings, ...data.settings },
    stats: { ...base.stats, ...data.stats },
    ext: { ...base.ext, ...data.ext }
  };
  if ((data.v ?? 1) < 2) {
    const stacks = Object.values(data.lineage ?? {}).reduce((t, n) => t + (Number(n) || 0), 0);
    const refund = stacks * LINEAGE_REFUND;
    out.amber = (Number(data.amber) || 0) + refund;
    out.fossils = (data.fossils ?? []).map((f, i) => ({ ...f, gen: i + 1, won: false }));
    out.stats.gens = out.fossils.length;
    out.notice = refund ? `LINEAGE BONUSES BECAME ${refund} AMBER` : null;
  }
  delete out.lineage;
  // v2.2: the Tidal Coast sits before the Crater and the Crater needs it. Players who
  // already own the Crater get the Coast free, so nobody loses access.
  if (out.unlocks?.zoneCrater && !out.unlocks.zoneCoast) out.unlocks = { ...out.unlocks, zoneCoast: 1 };
  return out;
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
