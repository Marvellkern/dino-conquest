// Daily Hatchery rules (data/gacha.js). Phaser-free and pure on the save's `gacha` block,
// so tools/gacha-odds.mjs can run them. Pulls are resolved and applied here; the caller
// saves straight away, before any reveal animation (a refresh never rerolls or loses one).
import { DAY_MS, PRICE, FEATURED_RATE, VARIANT_SHARE, PITY, FILLER, CRAFT, WEEK, ROTATION, HISTORY_MAX } from '../data/gacha.js';
import { VARIANTS, VARIANT_ORDER } from '../data/variants.js';
import { SPECIES } from '../data/species.js';
import { makeRng } from './rng.js';

/* ---------- the banner ---------- */

export const utcDay = (now = Date.now()) => Math.floor(now / DAY_MS);
export const msToNextBanner = (now = Date.now()) => DAY_MS - (now % DAY_MS);

// The banner of a UTC day: { day, kind, species (null on Sunday's Any Legendary), rarity, rate }.
export function bannerFor(day) {
  const wd = (day + 4) % 7; // day 0 (1 Jan 1970) was a Thursday
  const kind = WEEK[wd], list = ROTATION[kind], week = Math.floor((day + 4) / 7);
  const nth = week * 2 + (wd === 4 || wd === 5 || wd === 6 ? 1 : 0); // each rarity has two days a week
  const rarity = kind === 'anyLegendary' ? 'legendary' : kind;
  return { day, kind, species: kind === 'anyLegendary' ? null : list[nth % list.length], pool: list, rarity, rate: FEATURED_RATE[rarity] };
}

/* ---------- the save block ---------- */

export const defaultGacha = () => ({
  eggs: {},         // egg key ('rex' or 'rex:magma') -> count
  variants: {},     // species -> { variant: true } owned forever
  shards: 0,        // Bone Shards
  pity: 0,          // pulls since the last featured hit (every banner)
  lastFree: null,   // UTC day of the last free pull
  credits: 0,       // extra free pulls (goal rewards), used after the daily one
  count: 0,         // pulls made: seeds the next pull's RNG
  salt: (Math.random() * 2 ** 32) >>> 0,
  history: []       // last HISTORY_MAX: { day, banner, result }
});

export const eggKey = (species, variant = null) => (variant ? `${species}:${variant}` : species);
export const parseEgg = (key) => { const [species, variant = null] = key.split(':'); return { species, variant }; };
export const dailyReady = (g, day = utcDay()) => g.lastFree !== day;
// A single pull is free now: today's daily one, or a free pull from a goal.
export const freeReady = (g, day = utcDay()) => dailyReady(g, day) || (g.credits ?? 0) > 0;
export const ownsVariant = (g, species, v) => !!g.variants[species]?.[v];

/* ---------- one pull ---------- */

const pickWeighted = (rng, items, w = (x) => x.weight) => {
  let r = rng.next() * items.reduce((t, x) => t + w(x), 0);
  for (const x of items) { r -= w(x); if (r < 0) return x; }
  return items.at(-1);
};

// Resolve one pull on a banner. eggPool: species a random egg can be (hatchable, no
// Legendaries). Returns { kind: 'featured', species, variant } | { kind: 'shards', n } |
// { kind: 'egg', species } | { kind: 'refund', n }, and moves the pity counter.
export function rollPull(g, banner, rng, eggPool) {
  const pity = g.pity + 1 >= PITY;
  if (pity || rng.chance(banner.rate)) {
    g.pity = 0;
    const species = banner.species ?? rng.pick(banner.pool);
    const variant = rng.chance(VARIANT_SHARE) ? pickWeighted(rng, VARIANT_ORDER, (v) => VARIANTS[v].weight) : null;
    return { kind: 'featured', species, variant, pity };
  }
  g.pity++;
  const f = pickWeighted(rng, FILLER);
  if (f.kind === 'egg') {
    const rarity = pickWeighted(rng, Object.keys(f.odds), (r) => f.odds[r]);
    const list = eggPool.filter((s) => SPECIES[s].rarity === rarity);
    const species = list.length ? rng.pick(list) : rng.pick(eggPool);
    return { kind: 'egg', species };
  }
  return { kind: f.kind, n: rng.int(f.min, f.max) };
}

// Put a result into the save: eggs, a new variant, shards, Amber back (into meta.amber).
function apply(meta, r) {
  const g = meta.gacha;
  if (r.kind === 'featured' || r.kind === 'egg') {
    const k = eggKey(r.species, r.variant);
    g.eggs[k] = (g.eggs[k] ?? 0) + 1;
    if (r.variant) {
      r.isNew = !ownsVariant(g, r.species, r.variant);
      (g.variants[r.species] ??= {})[r.variant] = true;
    }
  } else if (r.kind === 'shards') g.shards += r.n;
  else if (r.kind === 'refund') meta.amber += r.n;
}

/* ---------- paying and pulling ---------- */

// What n pulls (1 or 10) would cost now: 0 for today's free single.
export function pullCost(g, n, day = utcDay()) {
  if (n === 1) return freeReady(g, day) ? 0 : PRICE.one;
  return PRICE.ten;
}

// Pay for and resolve n pulls (1 or 10) on today's banner. Returns { results } or
// { error }. Each pull gets its own RNG seeded from the save's counter and salt, so it
// can't be predicted from the date or replayed by reloading.
export function doPulls(meta, n, { now = Date.now(), eggPool }) {
  const g = meta.gacha, day = utcDay(now), banner = bannerFor(day), cost = pullCost(g, n, day);
  if (meta.amber < cost) return { error: 'NOT ENOUGH AMBER' };
  meta.amber -= cost;
  if (n === 1 && cost === 0) { if (dailyReady(g, day)) g.lastFree = day; else g.credits--; }
  const results = [];
  for (let i = 0; i < n; i++) {
    const rng = makeRng((g.salt ^ Math.imul(g.count + 1, 0x9e3779b1)) >>> 0);
    g.count++;
    const r = rollPull(g, banner, rng, eggPool);
    apply(meta, r);
    results.push(r);
    g.history.unshift({ day, banner: banner.species ?? 'anyLegendary', ...r });
  }
  g.history.length = Math.min(g.history.length, HISTORY_MAX);
  return { results, banner, cost };
}

/* ---------- eggs and shards ---------- */

// Start a run with an egg: one is used up (call only when the run actually starts).
export function useEgg(g, key) {
  if (!(g.eggs[key] > 0)) return false;
  if (--g.eggs[key] === 0) delete g.eggs[key];
  return true;
}

// Craft an egg with Bone Shards: any species you've hatched or pulled (100), or another
// egg of a variant you own (300). known: species hatched or pulled (meta.dex keys + eggs).
export function craftCost(key) { return parseEgg(key).variant ? CRAFT.variant : CRAFT.species; }
export function craft(g, key, known) {
  const { species, variant } = parseEgg(key), cost = craftCost(key);
  if (variant ? !ownsVariant(g, species, variant) : !known.includes(species)) return { error: 'NOT UNLOCKED' };
  if (g.shards < cost) return { error: 'NOT ENOUGH SHARDS' };
  g.shards -= cost;
  g.eggs[key] = (g.eggs[key] ?? 0) + 1;
  return { ok: true };
}
