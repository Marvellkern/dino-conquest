import { SPECIES, HATCHABLE } from './species.js';

// Goals shown in the Nest. Each one nudges a different playstyle and unlocks
// something (systems/goals.js checks them and pays the reward).
//
// test(ev, run, meta): ev is what just happened:
//   { type: 'fight', node, fight }  a won fight (fight: { braces, dmg })
//   { type: 'zone', zone }          a zone boss beaten
//   { type: 'end', won }            the run is over
//   { type: 'hatch' }               a new dino hatched (run is null)
// run.stats holds the in-run counters (systems/battleState.js tally()).
// reward: { amber } | { relic } | { mutation: 'move:id' } | { unlock: key, label }
const common = (run) => SPECIES[run.dino.species].rarity === 'common';
const zoneClear = (ev, z) => ev.type === 'zone' && ev.zone === z;
const n = (run, k) => run?.stats?.[k] ?? 0;

export const GOALS = {
  firstBlood:   { name: 'First Blood',   desc: 'WIN A FIGHT', reward: { amber: 30 },
    test: (ev) => ev.type === 'fight' },
  commonGround: { name: 'Common Ground', desc: 'CLEAR THE JUNGLE WITH A COMMON', reward: { unlock: 'egg:golden', label: 'GOLDEN EGG' },
    test: (ev, run) => zoneClear(ev, 'jungle') && common(run) },
  untouchable:  { name: 'Untouchable',   desc: '10 PERFECT DODGES IN ONE RUN', reward: { relic: 'raptorClaw' },
    test: (ev, run) => n(run, 'dodges') >= 10 },
  noShield:     { name: 'No Shield',     desc: 'BEAT ALPHA REX WITHOUT BRACING', reward: { unlock: 'skin:alpha', label: 'ALPHA REX SKIN' },
    test: (ev) => ev.type === 'fight' && ev.node.type === 'boss' && ev.zone === 'jungle' && ev.fight.braces === 0 },
  stampede:     { name: 'Stampede',      desc: 'KILL 3 ENEMIES WITH ONE MOVE', reward: { relic: 'packTotem' },
    test: (ev, run) => n(run, 'multiKill') >= 3 },
  ironWall:     { name: 'Iron Wall',     desc: 'BLOCK 10 HITS WHILE BRACED IN ONE RUN', reward: { relic: 'thickSkull' },
    test: (ev, run) => n(run, 'blocks') >= 10 },
  hotStreak:    { name: 'Hot Streak',    desc: 'FILL THE CRIT STREAK 4 TIMES IN ONE RUN', reward: { relic: 'glowShard' },
    test: (ev, run) => n(run, 'streaks') >= 4 },
  venomous:     { name: 'Venomous',      desc: 'KILL 4 ENEMIES WITH POISON IN ONE RUN', reward: { mutation: 'bite:chain' },
    test: (ev, run) => n(run, 'poisonKills') >= 4 },
  tailSpinner:  { name: 'Tail Spinner',  desc: 'LAND 20 TAIL WHIP HITS IN ONE RUN', reward: { mutation: 'tail:stun' },
    test: (ev, run) => n(run, 'tailHits') >= 20 },
  warCry:       { name: 'War Cry',       desc: 'ROAR 12 TIMES IN ONE RUN', reward: { mutation: 'roar:rally' },
    test: (ev, run) => n(run, 'roars') >= 12 },
  flawless:     { name: 'Flawless',      desc: 'WIN 3 FIGHTS WITHOUT A SCRATCH IN ONE RUN', reward: { relic: 'pteraBone' },
    test: (ev, run) => n(run, 'cleanFights') >= 3 },
  eliteHunter:  { name: 'Elite Hunter',  desc: 'BEAT 3 ELITES IN ONE RUN', reward: { amber: 80 },
    test: (ev, run) => n(run, 'elites') >= 3 },
  bigSpender:   { name: 'Big Spender',   desc: 'SPEND 80 AMBER IN SHOPS IN ONE RUN', reward: { unlock: 'discount', label: 'SHOPS 20% OFF' },
    test: (ev, run) => n(run, 'shopSpent') >= 80 },
  roughing:     { name: 'Roughing It',   desc: 'CLEAR THE JUNGLE WITHOUT A NEST', reward: { amber: 80 },
    test: (ev, run) => zoneClear(ev, 'jungle') && n(run, 'nests') === 0 },
  fullyGrown:   { name: 'Fully Grown',   desc: 'REACH THE FINAL FORM (LV10)', reward: { amber: 100 },
    test: (ev, run) => (run?.dino.evo ?? 0) >= 2 },
  heirloom:     { name: 'Heirloom',      desc: 'CLEAR THE JUNGLE WITH AN INHERITED ITEM', reward: { amber: 60 },
    test: (ev, run) => zoneClear(ev, 'jungle') && !!run.heir },
  swampKing:    { name: 'Swamp King',    desc: 'CLEAR THE SWAMP', reward: { unlock: 'ext', label: 'EXTINCTION LEVELS' },
    test: (ev) => zoneClear(ev, 'swamp') },
  underdog:     { name: 'Underdog',      desc: 'BEAT BOG SPINO WITH A COMMON', reward: { amber: 150 },
    test: (ev, run) => zoneClear(ev, 'swamp') && common(run) },
  eggCollector: { name: 'Egg Collector', desc: `HATCH ALL ${HATCHABLE.length} SPECIES`, reward: { amber: 100 },
    test: (ev, run, meta) => HATCHABLE.every((id) => meta.dex[id]) },
  extinct:      { name: 'Survivor',      desc: 'CLEAR EXTINCTION LEVEL 1', reward: { amber: 200 },
    test: (ev, run) => zoneClear(ev, 'swamp') && run.ext >= 1 },
  firewalker:   { name: 'Firewalker',    desc: 'CLEAR THE VOLCANO', reward: { relic: 'twinHorn' },
    test: (ev) => zoneClear(ev, 'volcano') },
  titanSlayer:  { name: 'Titan Slayer',  desc: 'BEAT THE METEOR TITAN', reward: { amber: 300 },
    test: (ev) => zoneClear(ev, 'crater') }
};

export const GOAL_ORDER = Object.keys(GOALS);
