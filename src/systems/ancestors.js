// Ancestor Call rules (primal surge brief §5). Phaser-free. During an Apex Strike, a dino
// from the family tree (meta.fossils) comes back as a spirit and strikes with its own
// species' finale. Once per run (run.ancestorCalls).
import { ANCESTOR } from '../data/surge.js';
import { MOVES } from '../data/moves.js';
import { SPECIES } from '../data/species.js';
import { RELIC_TUNING as RT } from '../data/relics.js';

// The strongest ancestor: highest level, then the more evolved form, then the most recent.
export function pickAncestor(fossils) {
  let best = null;
  for (const f of fossils ?? []) {
    if (!SPECIES[f.species]) continue;
    if (!best || f.level > best.level || (f.level === best.level && ((f.evo ?? 0) > (best.evo ?? 0)
      || ((f.evo ?? 0) === (best.evo ?? 0) && (f.gen ?? 0) > (best.gen ?? 0))))) best = f;
  }
  return best;
}

// Can this run still call one? calls: how many it has made; max: 1 (more with fossils later).
export const callsLeft = (run, used = 0) =>
  Math.max(0, (run?.relics?.includes('spiritAmber') ? RT.spiritCalls : ANCESTOR.perRun) - (run?.ancestorCalls ?? used)); // Spirit Amber: twice

// The ancestor's strike: a share of each target's max HP (like the Apex Strike, so it stays
// on target in every zone), a bit more for a higher-level ancestor, and its own species'
// special and aoe flag. It ignores half the target's DEF in spirit: there's no DEF in a share.
export function ancestorHit(st, targets, f, aoe) {
  const m = MOVES[SPECIES[f.species].special] ?? MOVES.bite;
  const species = Math.sqrt((m.power * (m.hits ?? m.spread ?? 1)) / 1.5);
  const level = 0.8 + 0.4 * Math.min(1, (f.level ?? 1) / ANCESTOR.fullLevel);
  return (aoe ? targets : targets.slice(0, 1)).filter((e) => e.hp > 0).map((e) => {
    const share = e.boss ? ANCESTOR.share.boss : ANCESTOR.share.normal;
    const dmg = Math.min(e.hp, Math.max(1, Math.round(e.maxHp * share * species * level * (aoe ? ANCESTOR.aoeMult : 1) * st.rng.range(0.95, 1.05))));
    e.hp -= dmg;
    if (e.boss && e.hp <= 0 && st.build.run?.stats) st.build.run.stats.ancestorBoss = 1; // Blood Remembers
    return { e, dmg, killed: e.hp <= 0 };
  });
}
