// Dino color variants (gacha brief v2.6 §5). Every hatchable species can come in each one.
// Pulled from the Daily Hatchery (data/gacha.js); once owned, random hatches of that
// species roll one of your variants 10% of the time.
//   weight  share inside the 30% "variant" part of a featured hit
//   glow    aura / light color for the lighting system
//   perk    one small flex (rules in systems/build.js). SPD only decides who goes first in a
//           fight, so Frost's SLOW makes the enemy's wind-ups 20% longer instead (easier to read)
// Palettes: sprites/variantArt.js.
export const VARIANTS = {
  albino:     { name: 'ALBINO',     weight: 7, glow: 0xffe0e8, perk: { dodge: 1.1 },                       desc: '+10% DODGE WINDOW' },
  melanistic: { name: 'MELANISTIC', weight: 7, glow: 0x9fb8ff, perk: { nightDmg: 1.1 },                    desc: '+10% DMG IN NIGHT ZONES' },
  frost:      { name: 'FROST',      weight: 6, glow: 0x9ae8ff, perk: { slowChance: 0.15, slowTurns: 2, slowTell: 1.2 }, desc: 'CRITS MAY SLOW (15%)' },
  magma:      { name: 'MAGMA',      weight: 6, glow: 0xff7a2a, perk: { burnChance: 0.1, burnDmg: 3, burnTurns: 2 }, desc: 'ATTACKS MAY BURN (10%)' },
  fossil:     { name: 'FOSSIL',     weight: 3, glow: 0xe8dcb8, perk: { revive: 0.2 },                      desc: 'REVIVE ONCE AT 20% HP' },
  golden:     { name: 'GOLDEN',     weight: 1, glow: 0xffd040, perk: { amber: 1.25 },                      desc: '+25% AMBER THIS RUN' }
};
export const VARIANT_ORDER = ['albino', 'melanistic', 'frost', 'magma', 'fossil', 'golden'];

// Random hatches of a species with owned variants roll one this often.
export const HATCH_VARIANT_CHANCE = 0.1;
// Zones that count as night for the Melanistic perk.
export const NIGHT_ZONES = ['jungle', 'coast', 'crater'];
