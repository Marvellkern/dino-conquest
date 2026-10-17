import { NEST_HEAL, SHOP } from '../data/zones.js';
import { EVENTS } from '../data/events.js';
import { RELICS } from '../data/relics.js';
import { choose } from '../ui/popup.js';
import { pickRelic, pickMutation } from '../ui/buildPicks.js';
import { heal, hurt, addStat, gainXp, relicOffers, addRelic, mutationOffer, removeRandomRelic, relicInfo } from '../run/run.js';
import { sfx } from '../systems/sfx.js';

// What happens at the non-battle map nodes. Each takes the Map scene and the run.

export async function visitNest(scene, run) {
  const amt = heal(run.dino, NEST_HEAL);
  sfx('levelup');
  scene.updateHud();
  await choose(scene, { title: 'NEST', lines: ['YOU CURL UP AND REST.', amt > 0 ? `+${amt} HP` : 'ALREADY AT FULL HP.'], options: [{ label: 'CONTINUE' }] });
}

export async function visitFossil(scene, run) {
  sfx('ding');
  const got = await pickRelic(scene, run, 'FOSSIL DIG', ['OLD BONES IN THE MUD.', 'TAKE ONE:']);
  if (!got) await choose(scene, { title: 'FOSSIL DIG', lines: ['NOTHING NEW DOWN HERE.'], options: [{ label: 'CONTINUE' }] });
}

export async function visitMeteor(scene, run) {
  sfx('tell');
  const ev = run.rng.pick(EVENTS), ctx = eventCtx(scene, run);
  const options = ev.options.map((o) => ({ label: o.label, sub: o.sub, disabled: o.need?.(ctx) ?? null }));
  const i = await choose(scene, { title: ev.title, lines: ev.lines, options });
  const result = (await ev.options[i].run(ctx)).filter(Boolean);
  scene.updateHud();
  await choose(scene, { title: ev.title, lines: result.slice(0, 4), options: [{ label: 'CONTINUE' }] });
}

// Shop: two fossils, a mutation and a heal, priced in in-run Amber. Buy until LEAVE.
export async function visitShop(scene, run) {
  sfx('ding');
  const stock = relicOffers(run, 2).map((id) => ({ kind: 'relic', id, price: SHOP.relic }));
  if (mutationOffer(run)) stock.push({ kind: 'mutation', price: SHOP.mutation });
  stock.push({ kind: 'heal', price: SHOP.heal });
  for (;;) {
    const options = stock.map((s) => ({
      label: `${label(s)}  ${s.price}A`,
      sub: s.sold ? 'SOLD' : s.kind === 'relic' ? RELICS[s.id].desc : s.kind === 'heal' ? `HEAL ${SHOP.healFrac * 100}% HP` : 'PICK A MOVE MUTATION',
      disabled: s.sold ? 'SOLD' : run.amber < s.price ? `NEED ${s.price} AMBER` : null
    }));
    options.push({ label: 'LEAVE', sub: '' });
    const i = await choose(scene, { title: `SHOP - YOU HAVE ${run.amber} AMBER`, options, bh: 26 });
    if (i >= stock.length) return;
    const s = stock[i];
    run.amber -= s.price;
    s.sold = true;
    if (s.kind === 'relic') { addRelic(run, s.id); sfx('levelup'); }
    else if (s.kind === 'heal') { heal(run.dino, SHOP.healFrac); sfx('levelup'); }
    else await pickMutation(scene, run, { keep: false });
    scene.updateHud();
  }
}

const label = (s) => (s.kind === 'relic' ? RELICS[s.id].name.toUpperCase() : s.kind === 'heal' ? 'HEALING HERBS' : 'MUTATION');

// Helpers handed to Meteor Shard events; each returns a result line.
function eventCtx(scene, run) {
  const d = run.dino;
  return {
    rng: run.rng,
    stat: (k, n) => { addStat(d, k, n); return `${n > 0 ? '+' : ''}${n} ${k.toUpperCase()}`; },
    maxHp: (n) => { addStat(d, 'hp', n); return `${n > 0 ? '+' : ''}${n} MAX HP`; },
    hurt: (f) => { sfx('hit'); scene.fx.shake(2, 150); return `-${hurt(d, f)} HP`; },
    heal: (f) => `+${heal(d, f)} HP`,
    xp: (n) => {
      const lv = gainXp(d, n);
      return [`+${n} XP`, lv ? `LEVEL UP! LV${d.level}` : null];
    },
    amber: (n) => { const before = run.amber; run.amber = Math.max(0, run.amber + n); return `${n > 0 ? '+' : ''}${run.amber - before} AMBER`; },
    amberLeft: () => run.amber,
    relicCount: () => run.relics.length,
    relic: async () => { const id = await pickRelic(scene, run, 'FOSSIL', ['TAKE ONE:']); return id ? `GOT ${RELICS[id].name.toUpperCase()}` : 'NO NEW FOSSILS LEFT'; },
    mutation: async () => (await pickMutation(scene, run, { keep: false })) ?? 'NOTHING LEFT TO MUTATE',
    loseRelic: () => { const id = removeRandomRelic(run); return id ? `LOST ${relicInfo(id).name.toUpperCase()}` : null; }
  };
}

