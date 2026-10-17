import { RARITIES } from './hatch.js';

// Permanent Lineage bonuses. Each fossil lets you pick one of 3; they stack up to `cap`.
// per: amount per stack. total(stacks): short summary for the home screen.
export const LINEAGE = {
  hp:     { name: 'STURDY BLOOD', desc: '+5 BASE HP',          per: 5,    cap: 10, total: (n) => `+${n * 5} HP` },
  atk:    { name: 'KEEN FANGS',   desc: '+1 BASE ATK',         per: 1,    cap: 5,  total: (n) => `+${n} ATK` },
  def:    { name: 'HARD SCALES',  desc: '+1 BASE DEF',         per: 1,    cap: 5,  total: (n) => `+${n} DEF` },
  rare:   { name: 'LUCKY CLUTCH', desc: '+2% RARER HATCHES',   per: 0.02, cap: 5,  total: (n) => `+${n * 2}% RARE` },
  reroll: { name: 'EGG WHISPER',  desc: '+1 FREE REROLL A RUN', per: 1,   cap: 3,  total: (n) => `${n} FREE RR` },
  amber:  { name: 'AMBER NOSE',   desc: '+10% AMBER EARNED',   per: 0.1,  cap: 5,  total: (n) => `+${n * 10}% AMB` },
  life:   { name: 'NINE LIVES',   desc: '+1 LIFE EACH RUN',    per: 1,    cap: 2,  total: (n) => `+${n} LIFE` }
};

export const BASE_LIVES = 3;
export const RETRY_HP = 0.5; // a lost fight restarts at 50% HP

export const stacks = (meta, id) => meta.lineage[id] ?? 0;
export const bonusOf = (meta, id) => stacks(meta, id) * LINEAGE[id].per;

// Up to n random bonuses that aren't capped yet.
export function lineageOffers(meta, n = 3) {
  const open = Object.keys(LINEAGE).filter((id) => stacks(meta, id) < LINEAGE[id].cap);
  for (let i = open.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [open[i], open[j]] = [open[j], open[i]];
  }
  return open.slice(0, n);
}

// Hatch odds after Lucky Clutch: shifts chance away from Common.
export function hatchOdds(meta) {
  const shift = Math.min(RARITIES.common.odds, bonusOf(meta, 'rare'));
  return {
    common: RARITIES.common.odds - shift,
    rare: RARITIES.rare.odds + shift * 0.6,
    epic: RARITIES.epic.odds + shift * 0.3,
    legendary: RARITIES.legendary.odds + shift * 0.1
  };
}
