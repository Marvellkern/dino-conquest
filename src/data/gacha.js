// The Daily Hatchery (gacha brief v2.6): a daily featured-dino egg banner paid with the
// run Amber you bank. No real money, ever: there are no purchases or ads anywhere.
// Rules in systems/gacha.js; odds sanity check: node tools/gacha-odds.mjs.

export const DAY_MS = 86400000; // banners change at 00:00 UTC

// Prices: one pull, ten pulls (one of them free), and one free pull a day (doesn't stack).
export const PRICE = { one: 50, ten: 450 };

// Chance per pull that it's the featured dino, by the banner's rarity.
export const FEATURED_RATE = { rare: 0.12, epic: 0.08, legendary: 0.05 };
export const VARIANT_SHARE = 0.3; // of featured hits: a variant (data/variants.js weights)

// The featured dino is guaranteed on the 30th pull without it. The counter is shared by
// every banner and carries over between days; any featured hit resets it.
export const PITY = 30;

// Everything else is never a blank: Bone Shards, a random egg, or some Amber back.
export const FILLER = [
  { kind: 'shards', weight: 60, min: 10, max: 30 },
  { kind: 'egg', weight: 35, odds: { common: 0.7, rare: 0.25, epic: 0.05 } }, // never a Legendary off its banner
  { kind: 'refund', weight: 5, min: 25, max: 75 }
];

// Bone Shards crafting: an egg of any species you've hatched or pulled, or another egg of a
// variant you own.
export const CRAFT = { species: 100, variant: 300 };

// The week, by UTC weekday (0 = Sunday). Each rarity's list rotates on its own days, so
// over three weeks every species gets featured (Rares and Epics twice a week each,
// Legendaries every week); Sunday's banner rolls any Legendary.
export const WEEK = ['anyLegendary', 'rare', 'legendary', 'epic', 'rare', 'legendary', 'epic'];
export const ROTATION = {
  rare: ['raptor', 'sarco', 'ptera', 'dilo'],
  epic: ['trike', 'spino', 'stego', 'theri'],
  legendary: ['rex', 'carno'],
  anyLegendary: ['rex', 'carno']
};

// Pull history kept in the save (for the history screen).
export const HISTORY_MAX = 50;
