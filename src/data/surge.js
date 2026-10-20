// Primal Surge + Apex Strike (primal surge brief v2.5 §2-4). Rules in systems/surge.js;
// the presentation in battle/surge.js and battle/apex*.js.
//
// Balance (step 6, node tools/sim.mjs vs SURGE=0): the brief's numbers made it far too
// strong (expert Crater clears 24% -> 62%, 0.5-0.8 surges a fight). The values below keep
// clear rates near the brief's cap and ~1 surge every 2-3 fights: half the gains, +1 energy
// only when it starts, crits x2.0, FEAR -10%. The Apex then went up again halfway (it felt
// too weak at ~26% / ~7%), which lifts expert clears +12-14 from the Volcano on, skilled
// +4-9, decent +15 in the Jungle (the comeback from hits taken).

export const SURGE = {
  max: 100,
  // Meter gains. Perfect dodges and crits also get streakBonus per streak step above
  // streakFrom (battle/flow.js streak), so skilled play gets there faster.
  gain: { dodge: 10, crit: 8, kill: 5, hit: 5, block: 3 }, // crit: once per move (brief: 20/15/10/10/5)
  streakBonus: 5, streakFrom: 2, streakMax: 5, // the streak bonus tops out at +5
  bossMult: 0.5,   // every gain in a boss fight
  carry: 0.5,      // of the meter goes into the next fight; a new zone starts at 0
  // The surge itself: lasts this many player turns (the one it starts on counts).
  turns: 2,
  energy: 1,       // extra when it starts, even past the max
  energyTurn: 0,   // extra on each later surge turn (brief: 1; the biggest single boost in the sim)
  critMult: 2.0,   // crits (instead of data/moves.js QTE_MULT.crit 1.75; brief 2.25); attacks can't miss
  fear: 0.9,       // enemies' ATK while it lasts (brief 0.8) (bosses are STAGGERED instead: their next
                   // charge-up is skipped and phase 2 waits until it ends)
  grow: 1.15       // the dino scales up
};

// Apex Strike: replaces the special during a surge, once per surge.
export const APEX = {
  cost: 2,
  beats: 5,         // the rhythm QTE, on the music's beat
  lead: 2,          // beats before the first marker reaches the line
  window: { perfect: 60, good: 130 }, // ms either side; scaled by the zone like the other QTEs
  // Per landed beat: a share of the target's max HP (enemy HP grows much faster across the
  // zones than the dino's damage, so a share keeps the strike on target everywhere), times
  // a species factor from its special (sqrt of the special's total power / 1.5, ~0.9-1.15).
  // 3 perfect + 2 good takes ~35% of a normal enemy and ~11% of a boss; all 5 perfect ~50% / ~17%.
  // (The brief aimed at 35-50% / 15-20%; the full amount broke its clear-rate cap, bosses most.)
  share: { normal: 0.06, boss: 0.02 },
  perfectMult: 1.25,
  allPerfect: 1.35, // all 5 perfect: +35% and an APEX! flash (brief +50%)
  aoeMult: 0.6,     // an aoe species' hits on each enemy
  slow: 0.5,        // the clock during the strike (the QTE runs in real time)
  zoom: 1.25,
  hitstopMs: 200,
  numberMs: 600
};

// The Apex Strike of each species (animations in battle/apexMoves*.js). aoe: the hits
// spread over every enemy. aura: the surge flames' color (a color variant uses its glow).
export const APEX_STRIKES = {
  rex:    { name: 'TYRANT CRUSH',     aura: 0xf77622 },
  carno:  { name: 'HORNED RAMPAGE',   aura: 0xe43b44 },
  raptor: { name: 'PACK FRENZY',      aura: 0xfeae34 },
  compy:  { name: 'SWARM TIDE',       aura: 0x63c74d, aoe: true },
  trike:  { name: 'STAMPEDE',         aura: 0xfee761, aoe: true },
  ankylo: { name: 'EARTHSHAKER',      aura: 0xe4a672, aoe: true },
  pachy:  { name: 'SKULLQUAKE',       aura: 0xfff096 },
  stego:  { name: 'SPIKE STORM',      aura: 0x63c74d, aoe: true },
  spino:  { name: 'TIDAL MAW',        aura: 0x2ce8f5 },
  sarco:  { name: 'ABYSS ROLL',       aura: 0x0099db },
  ptera:  { name: 'SKY STRIKE',       aura: 0xc0cbdc },
  dilo:   { name: 'VENOM BLOOM',      aura: 0xb55088 },
  theri:  { name: "REAPER'S HARVEST", aura: 0x9ae8ff }
};

// Ancestor Call (systems/ancestors.js): during an Apex Strike, the family tree's strongest
// dino strikes too. perRun: calls a run gets. prompt: how long "CALL YOUR ANCESTOR?" waits.
// Its hit: a share of max HP (~10% of a boss), x0.8-1.2 for its level (full at fullLevel).
export const ANCESTOR = {
  perRun: 1,
  promptMs: 1200,
  share: { normal: 0.22, boss: 0.09 },
  fullLevel: 15,
  aoeMult: 0.6,
  tint: 0x9fe8ff,   // the spirit: its own colors washed pale cyan, see-through
  alpha: 0.6
};
