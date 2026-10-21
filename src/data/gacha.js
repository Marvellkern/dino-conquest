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

// Pulled dinos are yours for good (start runs with them any time). Pulling one you already
// have turns it into Amber, by rarity; a variant you already have gives more.
export const DUPE_AMBER = { common: 10, rare: 20, epic: 35, legendary: 60, variant: 100 };

// Bone Shards buy a variant you don't have yet, for a dino you own.
export const CRAFT = { variant: 600 };

// The week, by UTC weekday (0 = Sunday). Each rarity's list rotates on its own days, so
// over three weeks every species gets featured (Rares and Epics twice a week each,
// Legendaries every week); Sunday's banner rolls any Legendary.
export const WEEK = ['anyLegendary', 'rare', 'legendary', 'epic', 'rare', 'legendary', 'epic'];
export const ROTATION = {
  rare: ['raptor', 'sarco', 'ptera', 'dilo', 'plesio'],
  epic: ['trike', 'spino', 'stego', 'theri', 'bary'],
  legendary: ['rex', 'carno', 'mosa'],
  anyLegendary: ['rex', 'carno', 'mosa']
};

// Starting a run (scenes/Hatch.js): a Random Hatch gets +50% Amber for the run and one free
// reroll, so rolling stays worth it next to picking a dino you own From Collection.
export const RANDOM_HATCH = { amber: 1.5, rerolls: 1 };

// Pull history kept in the save (for the history screen).
export const HISTORY_MAX = 50;

// The banner's backdrop: the featured dino's home zone (Sunday's Any Legendary: the Crater).
export const HOME_ZONE = {
  raptor: 'jungle', trike: 'jungle', rex: 'jungle', sarco: 'swamp', spino: 'swamp', stego: 'volcano', carno: 'volcano',
  ptera: 'coast', dilo: 'coast', theri: 'crater', plesio: 'coast', bary: 'coast', mosa: 'coast', anyLegendary: 'crater'
};

// How each pull result shows: its light color and how it ranks (the 10-pull's best gets the
// full reveal).
export const RESULT_LOOK = { featured: { color: 0xffd040, rank: 10 }, refund: { color: 0xe8a030, rank: 1 }, shards: { color: 0xc0cbdc, rank: 0 } };
