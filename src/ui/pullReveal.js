import { W, H, COLORS, lp } from '../config.js';
import { RESULT_LOOK } from '../data/gacha.js';
import { RARITIES } from '../data/hatch.js';
import { SPECIES } from '../data/species.js';
import { MOVES } from '../data/moves.js';
import { VARIANTS } from '../data/variants.js';
import { sfx } from '../systems/sfx.js';
import { chime } from '../systems/perfectSfx.js';
import { music } from '../systems/music.js';
import { onPress } from '../systems/qte.js';
import { skinOf } from '../run/run.js';
import { createRig } from '../sprites/rig.js';
import { ensureSkin } from '../sprites/skinBuild.js';
import { glowTexture } from '../render/atmos.js';
import { roar, wait } from '../battle/anims.js';
import { panel } from './pixel.js';
import { text } from './font.js';

// The Daily Hatchery's pull reveals (gacha brief §7). The pull is already saved when these
// run, so a refresh never loses or rerolls one.
//   single: an egg drops onto the ground, wobbles and cracks in 3 stages; light leaks from
//     the cracks in the result's color (grey / blue / purple / gold); a featured hit is gold,
//     ducks the music and rises a chime; a variant flashes its color and slams VARIANT!; the
//     dino bursts out and roars and its card slides in (NEW! the first time)
//   ten: 10 eggs crack quickly in a row (tap to hurry), then the best one gets the full reveal
// Tap skips a reveal's build-up once one has been seen this session.
const ADD = Phaser.BlendModes.ADD;
let seenOne = false; // this session

export const lookOf = (r) => {
  if (r.kind === 'egg') { const rar = RARITIES[SPECIES[r.species].rarity]; return { color: parseInt(rar.color.slice(1), 16), rank: { common: 2, rare: 3, epic: 4, legendary: 5 }[SPECIES[r.species].rarity] }; }
  return RESULT_LOOK[r.kind];
};
export const bestOf = (results) => results.reduce((a, b) => (lookOf(b).rank + (b.variant ? 1 : 0) > lookOf(a).rank + (a.variant ? 1 : 0) ? b : a));
export const resultName = (r) => (r.kind === 'shards' ? `+${r.n} BONE SHARDS` : r.kind === 'refund' ? `+${r.n} AMBER`
  : `${(SPECIES[r.species].short ?? SPECIES[r.species].name).toUpperCase()}${r.variant ? ` · ${VARIANTS[r.variant].name}` : ''}`);

// One full reveal (NEW! for a dino or variant you didn't have; a duplicate shows its Amber).
export async function revealOne(s, r, { x, ground }) {
  const look = lookOf(r), objs = [];
  let skip = false;
  const off = seenOne ? onPress(s, () => { skip = true; }) : () => {};
  const nap = (ms) => (skip ? Promise.resolve() : wait(s, ms));
  // The egg drops in.
  const egg = s.add.image(x, -20, 'egg').setOrigin(0.5, 1).setScale(2).setDepth(20);
  objs.push(egg);
  await new Promise((res) => s.tweens.add({ targets: egg, y: ground, duration: skip ? 1 : 320, ease: 'Bounce.Out', onComplete: res }));
  s.fx.dust(x, ground, 5);
  sfx('step');
  // Cracks, and the light leaking out.
  const glow = s.add.image(x, ground - 16, glowTexture(s)).setTint(look.color).setBlendMode(ADD).setDepth(19).setDisplaySize(10, 10).setAlpha(0);
  objs.push(glow);
  if (r.kind === 'featured') music.duck(1600, 0.25);
  for (let k = 1; k <= 3; k++) {
    await nap(260);
    egg.setTexture(`egg_crack${k}`);
    egg.x = x + (k % 2 ? 2 : -2);
    s.time.delayedCall(60, () => { egg.x = x; });
    if (r.kind === 'featured') chime(k * 2); else sfx('tell');
    s.tweens.add({ targets: glow, displayWidth: 20 + k * 22, displayHeight: 20 + k * 22, alpha: 0.35 + k * 0.15, duration: 200 });
  }
  await nap(220);
  // A variant: its own flash, and VARIANT!
  const v = VARIANTS[r.variant];
  if (v) {
    flash(s, v.glow, 0.7);
    sfx('levelup');
    const t = text(s, W / 2, lp(40, 60), 'VARIANT!', { scale: 3, color: `#${v.glow.toString(16).padStart(6, '0')}`, origin: 0.5 }).setDepth(41);
    s.tweens.add({ targets: t, alpha: 0, delay: 700, duration: 300, onComplete: () => t.destroy() });
    await nap(350);
  }
  off();
  // It bursts open.
  egg.destroy();
  flash(s, 0xffffff, 0.9);
  sfx('crit');
  s.fx.shake(3, 220);
  music.stinger(r.kind === 'featured' ? 'victory' : 'hatch');
  s.tweens.add({ targets: glow, displayWidth: 200, displayHeight: 200, alpha: 0, duration: 600, onComplete: () => glow.destroy() });
  shell(s, x, ground);
  let rig = null;
  if (r.species) {
    rig = createRig(s, r.species, x, ground, 1, skinOf(r.species, 0, null, r.variant), 2);
    rig.c.setDepth(18);
    objs.push(rig.c);
    if (!skip) await roar(s, rig, () => {});
    rig.startIdle();
  } else prize(s, r, x, ground, objs);
  // The card.
  objs.push(...card(s, r));
  seenOne = true;
  await tapToGo(s, objs);
}

// Ten pulls: the eggs crack one after another (tap to hurry), then the best gets the full reveal.
export async function revealTen(s, results, { x, ground }) {
  const objs = [], n = results.length, cols = 5, gap = lp(46, 30);
  let fast = false;
  const off = onPress(s, () => { fast = true; });
  const at = (i) => ({ x: Math.round(x - ((cols - 1) * gap) / 2 + (i % cols) * gap), y: ground - (i < cols ? lp(36, 46) : 0) });
  const eggs = results.map((r, i) => {
    const p = at(i), e = s.add.image(p.x, p.y, 'egg').setOrigin(0.5, 1).setDepth(20).setAlpha(0);
    s.tweens.add({ targets: e, alpha: 1, y: { from: p.y - 30, to: p.y }, delay: i * 40, duration: 200, ease: 'Quad.Out' });
    objs.push(e);
    return e;
  });
  await wait(s, 500);
  for (let i = 0; i < n; i++) {
    const r = results[i], look = lookOf(r), p = at(i), e = eggs[i];
    e.setTexture('egg_crack3');
    await wait(s, fast ? 40 : 160);
    e.setVisible(false);
    const g = s.add.image(p.x, p.y - 8, glowTexture(s)).setTint(look.color).setBlendMode(ADD).setDepth(19).setDisplaySize(30, 30).setAlpha(0.8);
    objs.push(g);
    if (r.species) objs.push(s.add.image(p.x, p.y, ensureSkin(s, skinOf(r.species, 0, null, r.variant))).setOrigin(0.5, 1).setDepth(20));
    else objs.push(text(s, p.x, p.y - 8, r.kind === 'shards' ? `+${r.n}` : `+${r.n}`, { origin: 0.5, small: true, color: r.kind === 'shards' ? '#c0cbdc' : '#e8a030' }).setDepth(21));
    if (r.kind === 'featured') { chime(3); flash(s, 0xffd040, 0.4); } else sfx(look.rank >= 3 ? 'ding' : 'tick');
  }
  off();
  await wait(s, 500);
  for (const o of objs) o.destroy();
  await revealOne(s, bestOf(results), { x, ground });
}

function flash(s, color, alpha) {
  const f = s.add.rectangle(0, 0, W, H, color, alpha).setOrigin(0).setDepth(50);
  s.tweens.add({ targets: f, alpha: 0, duration: 260, onComplete: () => f.destroy() });
}

function shell(s, x, ground) {
  for (let i = 0; i < 10; i++) {
    const r = s.add.rectangle(x, ground - 18, 3, 2, [0xe8dcb8, 0xb8a880, 0x7a9a50][i % 3]).setDepth(19);
    const a = -Math.PI * (0.1 + 0.8 * Math.random());
    s.tweens.add({ targets: r, x: x + Math.cos(a) * 34, y: ground - 18 + Math.sin(a) * 26, duration: 260, ease: 'Quad.Out' });
    s.tweens.add({ targets: r, y: ground - 2, alpha: 0, delay: 260, duration: 300, ease: 'Quad.In', onComplete: () => r.destroy() });
  }
}

// Shards or Amber: a little pile of what came out.
function prize(s, r, x, ground, objs) {
  const c = r.kind === 'shards' ? [0xe8dcb8, 0xb8a880] : [0xe8a030, 0xfeae34];
  for (let i = 0; i < 9; i++) objs.push(s.add.rectangle(x - 10 + (i % 5) * 5, ground - 2 - Math.floor(i / 5) * 3, 4, 3, c[i % 2]).setDepth(18));
  sfx(r.kind === 'shards' ? 'tick' : 'ding');
}

// The result card slides in under the banner text.
function card(s, r) {
  const w = lp(150, 168), h = 40, x = lp(W - 6 - w, 6), y = lp(30, 210);
  const g = s.add.graphics().setDepth(40);
  panel(g, x, y, w, h, { fill: r.kind === 'featured' ? 0x5a4a20 : undefined });
  const isNew = !!r.isNew;
  const sp = r.species ? SPECIES[r.species] : null;
  const line2 = r.variant ? VARIANTS[r.variant].desc : sp ? `${RARITIES[sp.rarity].name}  SPECIAL: ${MOVES[sp.special].name.toUpperCase()}` : r.kind === 'shards' ? 'FOR CRAFTING EGGS' : 'BACK TO YOUR AMBER';
  const out = [
    g,
    text(s, x + 6, y + 5, resultName(r), { color: r.kind === 'featured' ? '#ffd040' : COLORS.text }).setDepth(41),
    text(s, x + 6, y + 16, line2, { color: COLORS.textDim, small: true }).setDepth(41),
    text(s, x + 6, y + 26, r.dupe ? `ALREADY YOURS: +${r.dupe} AMBER` : r.species ? 'YOURS FOR GOOD: START RUNS WITH IT' : '', { color: r.dupe ? '#e8a030' : '#7fe0ff', small: true }).setDepth(41)
  ];
  if (isNew) out.push(text(s, x + w - 6, y + 5, 'NEW!', { color: '#ff6040', origin: [1, 0] }).setDepth(41));
  for (const o of out) { o.x += 40; s.tweens.add({ targets: o, x: o.x - 40, duration: 180, ease: 'Quad.Out' }); }
  return out;
}

function tapToGo(s, objs) {
  const hint = text(s, W / 2, H - lp(40, 50), 'TAP TO CONTINUE', { origin: 0.5, color: COLORS.textDim, small: true }).setDepth(41);
  s.tweens.add({ targets: hint, alpha: 0.3, duration: 450, yoyo: true, repeat: -1 });
  return new Promise((res) => {
    s.time.delayedCall(300, () => {
      const off = onPress(s, () => { off(); hint.destroy(); for (const o of objs) o.destroy?.(); res(); });
    });
  });
}
