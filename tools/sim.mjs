// Headless balance sim: plays full runs on the real rules (systems/ + run/),
// with a timing-based QTE model instead of the scenes.
//
// usage: node tools/sim.mjs [runs]
// env:   PLAYS=expert,skilled,decent,average   ONLY=compy,rex   ZONES=4 (default 4)
//        VET=1 (veteran save: every fossil pack, Sturdy Blood 3, Nine Lives)   EXT=n
//
// QTE model. Every press lands with a normal timing error (ms). Skill sets
// its spread; a defend ring's timing profile widens it (harder to read).
//   defend: perfect if |error| <= the real dodge window (zone, fatigue,
//           fossils, tight moves), block if <= the block window, else hit.
//   attack: the bar is rolled like the game's (data/qteProfiles.js rollBar);
//           the error becomes pixels at the marker's speed (sweep time and
//           curve), and a drifting sweet spot adds error.
import { MOVES } from '../src/data/moves.js';
import { SPECIES } from '../src/data/species.js';
import * as Z from '../src/data/zones.js';
import { TRAITS } from '../src/data/traits.js';
import * as UNL from '../src/data/unlocks.js';
import * as PG from '../src/data/progression.js';
import { zoneTiming, rollBar, MIN_DODGE_MS } from '../src/data/qteProfiles.js';
import { MUDDY } from '../src/data/moves.js';
import * as B from '../src/systems/battleState.js';
import * as BLD from '../src/systems/build.js';
import { dodgeWindow } from '../src/systems/combat.js';
import { makeRng } from '../src/systems/rng.js';
import * as R from '../src/run/run.js';

const N = +(process.argv[2] ?? 200);
const ZONES = +(process.env.ZONES ?? 4);

// Timing spread (ms, 1 sigma) for defend presses and attack presses.
//   expert ~90% perfect on a steady Jungle ring, ~70% Jungle crits
//   skilled ~70% / ~50%, decent ~40% / ~25%, average ~15% / ~10%
export const PLAY = {
  expert: { def: 52, atk: 31 },
  skilled: { def: 70, atk: 42 },
  decent: { def: 115, atk: 75 },
  average: { def: 450, atk: 254 }
};
// How much harder each defend profile is to read (multiplies the spread).
const PROFILE_SPREAD = { steady: 1, lunge: 1.43, snap: 1.43, delay: 1.96, combo: 1.96, feint: 1.96 };

function gauss(rng) {
  const u = Math.max(1e-9, rng.next()), v = rng.next();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// Stats per play profile and zone: rings, perfect dodges, bars, crits, damage, fights.
const stats = {};
const zstat = (play, zone) => ((stats[play] ??= {})[zone] ??= { rings: 0, dodges: 0, bars: 0, crits: 0, dmg: 0, fights: 0 });

function attackQte(st, play, m, muddy, S, blind = false) {
  const sh = rollBar(st.rng, st.timing.bar);
  const speed = (98 / sh.sweepMs) * (sh.curve === 'linear' ? 1 : 0.45 + st.rng.next() * 1.1); // px per ms at the sweet spot
  // Blinded: the marker shows up late, and a sweet spot under the cover is mostly guesswork.
  const blindK = blind ? (sh.center < 0.35 ? 2.2 : 1.3) : 1;
  const err = Math.abs(gauss(st.rng) * PLAY[play].atk * (sh.drift ? 1.25 : 1) * blindK) * speed;
  const sweet = sh.sweetW * (muddy ? MUDDY.sweet : 1), good = sh.goodW * (muddy ? MUDDY.good : 1);
  let q = err <= sweet / 2 ? 'crit' : err <= good / 2 ? 'good' : 'miss';
  if (m.sure && q === 'miss') q = 'good';
  S.bars++; if (q === 'crit') S.crits++;
  return q;
}

function defendQte(st, play, e, moveId, S) {
  const m = MOVES[moveId], p = st.player, tight = m.tight ?? 1;
  const own = moveId === e.intent?.move;
  const prof = own ? e.intent.profile ?? 'steady' : 'snap';
  const spread = PLAY[play].def * (PROFILE_SPREAD[prof] ?? 1) * (e.tellMult < 1 ? 1.1 : 1);
  const dodgeMs = Math.max(MIN_DODGE_MS, dodgeWindow(p, st.timing.dodgeMs) * BLD.dodgeMult(st) * tight * B.dodgeFatigue(st));
  const blockMs = st.timing.blockMs * (tight < 1 ? 0.8 : 1);
  const err = Math.abs(gauss(st.rng) * spread);
  let r = err <= dodgeMs ? 'dodge' : err <= blockMs ? 'block' : 'hit';
  if (m.sure && r === 'dodge') r = 'block';
  S.rings++;
  return r;
}

// Policy: brace against big incoming hits (red rings count fully, purple not
// at all: brace can't stop them), special when affordable, else bite.
function playerTurn(st, play, S) {
  const p = st.player;
  for (let guard = 0; guard < 10 && B.affordable(st) && !B.won(st); guard++) {
    const incoming = B.alive(st).reduce((t, e) => t + (B.isStrike(e.intent) && e.intent.ring !== 'purple'
      ? B.intentDamage(st, e) * (e.intent.hits ?? 1) * (e.intent.ring === 'red' ? 1.5 : 1) : 0), 0);
    const tgts = B.targetable(st).sort((a, b) => a.hp - b.hp);
    const sp = p.moves[4];
    let id;
    if (!p.status.braced && incoming >= p.hp * 0.3 && !B.blocked(st, 'brace') && (st.energy === 1 || incoming >= p.hp * 0.5)) id = 'brace';
    else if (!B.blocked(st, sp)) id = sp;
    else if (!B.blocked(st, 'roar') && incoming >= p.hp * 0.25 && B.alive(st).some((e) => !e.status.atkDown)) id = 'roar';
    else if (!B.blocked(st, 'bite')) id = 'bite';
    else if (!p.status.braced && !B.blocked(st, 'brace')) id = 'brace';
    else break;
    B.beginMove(st, id);
    const m = MOVES[id];
    if (m.status) B.playerRoar(st);
    else if (m.brace) B.playerBrace(st);
    else {
      const muddy = B.consumeMuddy(st), blind = B.consumeBlind(st);
      let strikes = m.spread ? 1 : BLD.moveHits(st, m), chains = 0;
      const main = tgts.find((t) => t.hp > 0);
      for (let h = 0; h < strikes && main && main.hp > 0; h++) {
        const q = B.finalQte(st, attackQte(st, play, m, muddy && h === 0, S, blind && h === 0)).qte;
        B.noteQte(st, q);
        const tl = B.targetable(st);
        const victims = BLD.hitsAll(st, id) ? tl : m.spread ? Array.from({ length: BLD.spreadCount(st, m) }, (_, k) => tl[k % Math.max(1, tl.length)]) : [main];
        for (const t of victims) {
          if (!t || t.hp <= 0) continue;
          const res = B.playerStrike(st, id, t, q);
          if (res.evaded && t.brain.noPounce) continue;
          if (res.evaded) { // raptor / ptera pounce back
            const r = B.enemyStrike(st, t, defendQte(st, play, t, 'pounce', S), 'pounce');
            if (r.defend === 'dodge' && t.hp > 0 && B.counterReady(st)) B.counterStrike(st, t);
            if (B.lost(st)) return;
          } else if (res.fx?.chain && chains < 2) { chains++; strikes++; }
        }
      }
      if (m.self) p.status[m.self.stat] = m.self.turns + 1;
      if (main) B.afterAttack(st, main);
    }
    B.endMove(st);
  }
}

function enemyPhase(st, play, S) {
  for (const e of [...B.alive(st)]) {
    if (e.hp <= 0) continue;
    const tick = B.beginEnemyAction(st, e);
    if (e.hp <= 0) continue;
    if (!tick.stunned) {
      B.enemyAct(st, e);
      if (B.isStrike(e.intent)) {
        let dodged = false;
        for (let h = 0; h < (e.intent.hits ?? 1); h++) {
          const r = B.enemyStrike(st, e, defendQte(st, play, e, e.intent.move, S));
          if (r.defend === 'dodge') { dodged = true; S.dodges++; }
          if (B.lost(st)) return;
        }
        if (dodged && !e.status.submerged && e.hp > 0 && B.counterReady(st)) B.counterStrike(st, e);
      }
    }
    B.finishEnemyAction(st, e);
  }
}

function fight(rng, run, node, play) {
  const S = zstat(play, run.zone);
  const player = R.playerFighter(run), hp0 = player.hp;
  const st = B.createBattle({ player, enemies: R.enemyFighters(node), rng, spawn: null, build: R.buildOf(run), timing: zoneTiming(run.zone, run.ext ?? 0) });
  st.spawn = (sp) => B.addEnemy(st, R.minionFighter(run.zone, sp, node.enemies[0].level));
  B.startBattle(st);
  let rounds = 0;
  while (rounds++ < 60) {
    const t = B.beginPlayerTurn(st);
    if (B.lost(st)) break;
    if (!t.stunned) playerTurn(st, play, S);
    if (B.won(st) || B.lost(st)) break;
    B.endPlayerTurn(st);
    enemyPhase(st, play, S);
    if (B.won(st) || B.lost(st)) break;
  }
  S.fights++;
  S.dmg += Math.max(0, hp0 - player.hp) + st.fight.dmg - Math.max(0, hp0 - player.hp); // st.fight.dmg: all damage taken, incl. healed back
  return { won: B.won(st) && !B.lost(st), hp: player.hp, rounds };
}

// Fossil picks: the best of the offers by a rough value a player would see
// (generic damage / survival high, situational ones low), ties at random.
const VALUE = {
  amberFang: 4, bloodAmber: 4, oldEgg: 4, emberCore: 3, obsidianScale: 3, crystalHeart: 3, sharpStone: 3, huntersEye: 3,
  packTotem: 3, mossyShell: 3, starShard: 3, swiftFeather: 3, tarPitStone: 3, meteorChip: 2, glowShard: 2, thickSkull: 2,
  fernCushion: 2, stormEgg: 2, raptorClaw: 2, echoRock: 2, ashCloak: 2, lavaFang: 2, pteraBone: 2, venomGland: 1,
  tailSpike: 1, boneDrum: 1, meteorIron: 1, twinHorn: 1, amberGeode: 0, volcanicHeart: 0,
  pearlHeart: 3, sharkTooth: 2, tideCharm: 2, kelpWrap: 2
};
const pickRelic = (rng, offers) => {
  const best = Math.max(...offers.map((id) => VALUE[id] ?? 1));
  return rng.pick(offers.filter((id) => (VALUE[id] ?? 1) === best));
};

// Mutation picks: the stronger option (Sweep hits every enemy).
const MUT_VALUE = { sweep: 3, leech: 3, terror: 3, venom: 2, chain: 2, rally: 1, stun: 1 }; // Terror cancels charged (boss) attacks
const pickMut = (rng, opts) => { const best = Math.max(...opts.map((o) => MUT_VALUE[o] ?? 1)); return rng.pick(opts.filter((o) => (MUT_VALUE[o] ?? 1) === best)); };

function simRun(species, seed, play) {
  const rng = makeRng(seed);
  const fresh = process.env.VET && !process.env.BASEPOOL ? {} : { pool: UNL.BASE_RELICS, mutLock: UNL.LOCKED_MUTATIONS };
  if (process.env.ALLMUT) fresh.mutLock = [];
  if (process.env.ADD) fresh.pool = [...UNL.BASE_RELICS, ...process.env.ADD.split(',')];
  // Veteran: Nine Lives, Sturdy Blood 3, and a Bloodline heir (an inherited Amber Fang).
  const vet = process.env.VET ? { lives: PG.BASE_LIVES + 1, bonus: { hp: 15 }, heir: { kind: 'relic', id: 'amberFang' } } : { lives: PG.BASE_LIVES };
  const zones = Z.ZONE_ORDER.slice(0, ZONES);
  const run = R.newRun({ species, trait: rng.pick(Object.keys(TRAITS)), seed, ext: +(process.env.EXT ?? 0), zones, ...vet, ...fresh });
  const d = run.dino;
  let zc = 0;
  for (;;) {
    const id = rng.pick(R.reachable(run));
    const node = run.map.nodes[id];
    run.at = id;
    if (node.enemies) {
      for (;;) {
        const r = fight(rng, run, node, play);
        if (r.won) {
          d.hp = Math.max(1, r.hp);
          run.amber += Math.round(Z.REWARDS[node.type].amber * BLD.amberMult(R.buildOf(run)));
          const lv = R.gainXp(d, Z.REWARDS[node.type].xp);
          if (node.type === 'elite') { const o = R.relicOffers(run, 3); if (o.length) R.addRelic(run, pickRelic(rng, o)); }
          for (let k = 0; k < lv; k++) { const mo = R.mutationOffer(run); if (mo) R.addMutation(run, mo.move, pickMut(rng, mo.options)); }
          while (d.pendingEvo) R.evolve(run);
          break;
        }
        if (--run.lives <= 0) return { zc, where: `${run.zone}:${node.row}` };
        d.hp = Math.round(R.dinoStats(d).hp * PG.RETRY_HP);
      }
      if (node.type === 'boss') { zc++; if (!R.advanceZone(run)) return { zc }; }
    } else if (node.type === 'nest') R.heal(d, run.mods?.nestHeal ?? Z.NEST_HEAL);
    else if (node.type === 'fossil') { const o = R.relicOffers(run, 3); if (o.length) R.addRelic(run, pickRelic(rng, o)); }
    else if (node.type === 'shop') {
      const o = R.relicOffers(run, 2);
      if (o.length && run.amber >= Z.SHOP.relic) { R.addRelic(run, pickRelic(rng, o)); run.amber -= Z.SHOP.relic; }
      else if (run.amber >= Z.SHOP.heal) { R.heal(d, Z.SHOP.healFrac); run.amber -= Z.SHOP.heal; }
    }
  }
}

// A fresh save hatches by rarity (data/hatch.js odds) from the base 7.
const HATCH = { compy: 0.3, pachy: 0.3, raptor: 0.14, sarco: 0.14, trike: 0.05, spino: 0.05, rex: 0.02 };
const pct = (n, d) => (d ? `${Math.round((100 * n) / d)}%` : '-').padStart(4);
const SP = process.env.ONLY ? process.env.ONLY.split(',') : Object.keys(HATCH);
const zonesShown = Z.ZONE_ORDER.slice(0, ZONES);

for (const play of (process.env.PLAYS ?? 'expert,skilled,decent').split(',')) {
  console.log(`\n== ${play} | ${N} runs per species | ${process.env.VET ? 'veteran' : 'fresh'} save${process.env.EXT ? ` | EXT ${process.env.EXT}` : ''} ==`);
  console.log(`species  ${zonesShown.map((z) => z.slice(0, 7).padStart(8)).join('')}   top deaths`);
  const weighted = zonesShown.map(() => 0);
  let wsum = 0;
  for (const sp of SP) {
    const zs = zonesShown.map(() => 0), died = {};
    for (let i = 0; i < N; i++) {
      const r = simRun(sp, 5000 + i, play);
      for (let k = 0; k < r.zc; k++) zs[k]++;
      if (r.where) died[r.where] = (died[r.where] ?? 0) + 1;
    }
    const w = HATCH[sp] ?? 0;
    zs.forEach((n, k) => { weighted[k] += (w * n) / N; });
    wsum += w;
    const top = Object.entries(died).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k, v]) => `${k}:${v}`).join(' ');
    console.log(`${sp.padEnd(8)} ${zs.map((n) => pct(n, N).padStart(8)).join('')}   ${top}`);
  }
  if (wsum) console.log(`${'HATCH-W'.padEnd(8)} ${weighted.map((v) => `${Math.round((100 * v) / wsum)}%`.padStart(8)).join('')}   (weighted by hatch odds)`);
  console.log(`qte      ${zonesShown.map((z) => z.slice(0, 7).padStart(8)).join('')}`);
  const zs = stats[play] ?? {};
  console.log(`dodge%   ${zonesShown.map((z) => pct(zs[z]?.dodges, zs[z]?.rings).padStart(8)).join('')}   perfect dodges per enemy hit`);
  console.log(`crit%    ${zonesShown.map((z) => pct(zs[z]?.crits, zs[z]?.bars).padStart(8)).join('')}   crits per attack bar`);
  console.log(`dmg/fght ${zonesShown.map((z) => (zs[z]?.fights ? Math.round(zs[z].dmg / zs[z].fights) : '-').toString().padStart(8)).join('')}   damage taken per fight`);
}
