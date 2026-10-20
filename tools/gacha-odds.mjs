// Daily Hatchery odds check (gacha brief v2.6 §3): pulls and Amber to the featured dino
// per banner rarity, exact and simulated through the real rules (systems/gacha.js).
//   node tools/gacha-odds.mjs
import { FEATURED_RATE, PITY, PRICE, VARIANT_SHARE } from '../src/data/gacha.js';
import { VARIANTS } from '../src/data/variants.js';
import { defaultGacha, doPulls, bannerFor, utcDay } from '../src/systems/gacha.js';

// Exact: P(first hit on pull k) = (1-p)^(k-1) p, forced at PITY.
function exact(p) {
  let mean = 0, alive = 1;
  for (let k = 1; k <= PITY; k++) {
    const hit = k === PITY ? alive : alive * p;
    mean += k * hit;
    alive -= hit;
  }
  return mean;
}

// Simulated: a fresh save pulling singles on a banner of that rarity until the featured hit.
function simulate(rarity, trials = 20000) {
  const day = [...Array(14).keys()].map((i) => utcDay() + i).find((d) => bannerFor(d).rarity === rarity);
  let sum = 0, worst = 0, variants = 0, shards = 0, eggs = 0, refund = 0;
  for (let t = 0; t < trials; t++) {
    const meta = { amber: 1e9, gacha: { ...defaultGacha(), lastFree: day, salt: t * 7919 } };
    for (let k = 1; ; k++) {
      const r = doPulls(meta, 1, { now: day * 86400000 + 1000, eggPool: ['compy', 'pachy', 'raptor', 'sarco', 'trike', 'spino'] }).results[0];
      if (r.kind === 'shards') shards += r.n; else if (r.kind === 'egg') eggs++; else if (r.kind === 'refund') refund += r.n;
      if (r.kind === 'featured') { sum += k; worst = Math.max(worst, k); if (r.variant) variants++; break; }
    }
  }
  return { mean: sum / trials, worst, variantShare: variants / trials, shardsPer: shards / trials, eggsPer: eggs / trials, refundPer: refund / trials };
}

const tenCost = (pulls) => Math.ceil(pulls / 10) * PRICE.ten;
console.log(`Daily Hatchery odds   (pity ${PITY}, ${PRICE.one} a pull, ${PRICE.ten} for 10, ${Math.round(VARIANT_SHARE * 100)}% of featured hits are variants)\n`);
console.log('banner      rate  avg pulls (exact / sim)  avg Amber (singles / 10s)  worst: pulls  Amber (singles / 10s)   per hit: shards  eggs  refund');
for (const r of ['rare', 'epic', 'legendary']) {
  const p = FEATURED_RATE[r], e = exact(p), s = simulate(r);
  console.log(`${r.padEnd(10)} ${String(Math.round(p * 100)).padStart(3)}%   ${e.toFixed(1).padStart(6)} / ${s.mean.toFixed(1).padEnd(14)} ${String(Math.round(e * PRICE.one)).padStart(8)} / ${String(Math.round(e * PRICE.ten / 10)).padEnd(14)} ${String(s.worst).padStart(9)}   ${PITY * PRICE.one} / ${tenCost(PITY)}${' '.repeat(16)}${s.shardsPer.toFixed(0).padStart(5)}  ${s.eggsPer.toFixed(1).padStart(4)}  ${s.refundPer.toFixed(0).padStart(5)}`);
}
const vw = Object.values(VARIANTS).reduce((t, v) => t + v.weight, 0);
console.log(`\nvariant odds per featured hit: ${Object.entries(VARIANTS).map(([k, v]) => `${k} ${(VARIANT_SHARE * v.weight / vw * 100).toFixed(1)}%`).join(', ')}`);
