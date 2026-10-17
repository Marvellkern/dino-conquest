// Fossils (in-run relics). Each one is a passive that changes how a fight plays;
// the effects are implemented in systems/build.js by id. Picked 1 of 3 at Fossil
// Dig nodes, dropped by every elite, sold in shops. icon: key in sprites/relicIcons.js.
// Trait synergies: Venom Bite + Tar Pit Stone / Venom Gland, Quick Reflexes +
// Raptor Claw / Swift Feather, Bloodlust + Blood Amber, Thunder Roar + Bone Drum /
// Echo Rock, Pack Instinct + Pack Totem.
export const RELICS = {
  amberFang:    { name: 'Amber Fang',      desc: 'CRITS HEAL 4 HP' },
  raptorClaw:   { name: 'Raptor Claw',     desc: 'DODGE COUNTERS HIT 1.0X' },
  tarPitStone:  { name: 'Tar Pit Stone',   desc: 'ENEMIES START POISONED 2' },
  volcanicHeart:{ name: 'Volcanic Heart',  desc: '+1 MAX ENERGY, -2 HP A TURN' },
  packTotem:    { name: 'Pack Totem',      desc: '+3 DMG PER ENEMY ALIVE' },
  meteorChip:   { name: 'Meteor Chip',     desc: 'FIRST ATTACK EACH FIGHT CRITS' },
  oldEgg:       { name: 'Old Egg',         desc: 'REVIVE ONCE AT 30% HP' },
  thickSkull:   { name: 'Thick Skull',     desc: 'BRACED BLOCKS REFLECT 30%' },
  boneDrum:     { name: 'Bone Drum',       desc: 'ROAR COSTS 0 ENERGY' },
  huntersEye:   { name: "Hunter's Eye",    desc: '+25% DMG VS ENEMIES <30% HP' },
  fernCushion:  { name: 'Fern Cushion',    desc: 'BRACE ALSO HEALS 4 HP' },
  sharpStone:   { name: 'Sharp Stone',     desc: 'BITE DEALS +30% DAMAGE' },
  stormEgg:     { name: 'Storm Egg',       desc: '+1 ENERGY ON TURN 1' },
  mossyShell:   { name: 'Mossy Shell',     desc: 'BLOCKS TAKE 35% (NOT 50%)' },
  swiftFeather: { name: 'Swift Feather',   desc: 'DODGE WINDOW +25%' },
  venomGland:   { name: 'Venom Gland',     desc: 'YOUR POISON DEALS +2' },
  bloodAmber:   { name: 'Blood Amber',     desc: 'KILLS HEAL 5 HP' },
  tailSpike:    { name: 'Tail Spike',      desc: 'TAIL WHIP POISONS 1' },
  echoRock:     { name: 'Echo Rock',       desc: 'ROAR DEALS 4 TO ALL' },
  glowShard:    { name: 'Glow Shard',      desc: 'CRIT STREAK NEEDS 2' }
};

// Evolution perks use the same hook system (see data/forms.js), but never drop.
export const PERKS = {
  perkSwarmlord: { name: 'Swarmlord',     desc: 'SWARM HITS 4 TIMES' },
  perkKing:      { name: 'Compy King',    desc: 'GHOST COMPY BITES 3 AFTER ATTACKS' },
  perkFeathers:  { name: 'Feathers',      desc: 'DODGE WINDOW +20%' },
  perkShadow:    { name: 'Shadow Strike', desc: 'COUNTERS DEAL 1.5X' },
  perkFrill:     { name: 'Great Frill',   desc: 'BRACED BLOCKS TAKE 30%' },
  perkWarhorn:   { name: 'Warhorn',       desc: 'HORN CHARGE HITS ALL' },
  perkTyrant:    { name: 'Tyrant Jaw',    desc: 'CRUSHING BITE COSTS 2' },
  perkAlpha:     { name: 'Alpha',         desc: 'KILLS GIVE +1 ENERGY' },
  perkBonehead:  { name: 'Bonehead',      desc: 'SKULL BASH CRITS STUN' },
  perkCrusher:   { name: 'Skullcrusher',  desc: 'SKULL BASH COSTS 1' },
  perkDeathjaw:  { name: 'Deathjaw',      desc: 'DEATH ROLL POISONS 2' },
  perkBogTyrant: { name: 'Bog Tyrant',    desc: 'START EACH FIGHT BRACED' },
  perkSailback:  { name: 'Sailback',      desc: '+1 MAX ENERGY' },
  perkTidelord:  { name: 'Tidelord',      desc: 'SWAMP SURGE HITS ALL' }
};

export const RELIC_TUNING = {
  amberFangHeal: 4, raptorClawMult: 1.0, tarPitPoison: 2, volcanicDmg: 2, packTotemDmg: 3,
  oldEggHp: 0.3, thickSkullReflect: 0.3, huntersBelow: 0.3, huntersMult: 1.25, fernHeal: 4,
  sharpStoneMult: 1.3, mossyBlock: 0.35, swiftMult: 1.25, venomGlandBonus: 2, bloodAmberHeal: 5,
  echoDmg: 4, feathersMult: 1.2, shadowMult: 1.5, frillBlock: 0.3, ghostBite: 3
};
