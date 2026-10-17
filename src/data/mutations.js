// Move mutations: one per base move per run, offered at level-ups and by some
// events. Effects in systems/build.js. btn/desc replace the move button text;
// color is the badge on the button.
export const MUTATIONS = {
  bite: {
    venom: { name: 'Venom Bite',     btn: 'VENOM',  desc: 'PSN +2',  color: 0x80d060, info: 'APPLIES 2 POISON' },
    leech: { name: 'Lifesteal Bite', btn: 'LEECH',  desc: 'HEAL30%', color: 0xe06060, info: 'HEAL 30% OF DAMAGE' },
    chain: { name: 'Chain Bite',     btn: 'CHAIN',  desc: 'CRIT X2', color: 0xfff096, info: 'ON CRIT, BITE AGAIN' }
  },
  tail: {
    sweep: { name: 'Sweep',          btn: 'SWEEP',  desc: 'ALL',     color: 0x7fe0ff, info: 'HITS EVERY ENEMY' },
    stun:  { name: 'Stunning Whip',  btn: 'STUN',   desc: 'CRIT ZZ', color: 0xffd040, info: 'A CRIT STUNS' }
  },
  roar: {
    terror: { name: 'Terror Roar',   btn: 'TERROR', desc: 'NO CHG',  color: 0xb070e0, info: 'CHARGING ENEMIES SKIP' },
    rally:  { name: 'Battle Roar',   btn: 'RALLY',  desc: '+1 EN',   color: 0xe8a030, info: '+1 ENERGY NEXT TURN' }
  }
};

export const MUTATION_TUNING = { venomPoison: 2, leech: 0.3, chainMax: 2 };
