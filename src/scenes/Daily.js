import { syncLayout } from '../systems/screen.js';
import { W, H, GROUND_Y, COLORS, lp } from '../config.js';
import { PRICE, PITY, FEATURED_RATE, VARIANT_SHARE, FILLER, HOME_ZONE } from '../data/gacha.js';
import { VARIANTS, VARIANT_ORDER } from '../data/variants.js';
import { RARITIES } from '../data/hatch.js';
import { SPECIES } from '../data/species.js';
import { MOVES } from '../data/moves.js';
import { meta, hatcheryPull } from '../systems/meta.js';
import { bannerFor, utcDay, msToNextBanner, freeReady, dailyReady, pullCost, ownsVariant } from '../systems/gacha.js';
import { checkGoals } from '../systems/goals.js';
import { showGoals } from '../ui/bloodline.js';
import { craftMenu } from '../ui/craftMenu.js';
import { Fx } from '../systems/fx.js';
import { sfx } from '../systems/sfx.js';
import { music } from '../systems/music.js';
import { skinOf } from '../run/run.js';
import { createRig } from '../sprites/rig.js';
import { ensureSkin } from '../sprites/skinBuild.js';
import { zoneBackdrop } from '../ui/zoneArt.js';
import { menuLight } from '../render/menuLight.js';
import { panel } from '../ui/pixel.js';
import { text } from '../ui/font.js';
import { amberCount, AMB } from '../ui/amber.js';
import { Button } from '../ui/button.js';
import { FocusNav } from '../ui/focus.js';
import { choose } from '../ui/popup.js';
import { revealOne, revealTen, resultName } from '../ui/pullReveal.js';

// The Daily Hatchery (gacha brief §2-3, §7-8): today's banner and its pulls, paid with banked
// Amber. No real money anywhere. The banner changes at 00:00 UTC; the odds and the pity
// counter are always on screen, with the full rates and the pull history a tap away.
const PULL_KEYS = { Digit1: 0, Digit2: 1, KeyE: 2, KeyR: 3, KeyH: 4 };
const two = (n) => String(n).padStart(2, '0');
const clock = (ms) => { const s = Math.floor(ms / 1000); return `${two(Math.floor(s / 3600))}:${two(Math.floor(s / 60) % 60)}:${two(s % 60)}`; };
const spName = (id) => (SPECIES[id].short ?? SPECIES[id].name).toUpperCase();

export class Daily extends Phaser.Scene {
  constructor() { super('Daily'); }

  create() {
    syncLayout(this);
    music.play('nest', { layer: 'full' });
    this.fx = new Fx(this);
    this.busy = false;
    this.day = utcDay();
    this.banner = bannerFor(this.day);
    const b = this.banner, zone = HOME_ZONE[b.species ?? 'anyLegendary'] ?? 'jungle';
    this.cameras.main.fadeIn(150);
    zoneBackdrop(this, zone, { progress: 0.5, baked: true }); // the featured dino's home, as its fights look
    menuLight(this, { zone });
    this.add.rectangle(0, 0, W, 16, 0x0c0e12, 0.75).setOrigin(0).setDepth(10);
    text(this, 6, 5, 'DAILY HATCHERY', { color: COLORS.accent }).setDepth(11);
    this.amber = amberCount(this, W - 6, 5, meta.amber);

    // The featured dino, big and idle (Sunday: the Legendaries take turns).
    this.dinoX = lp(78, 56);
    this.showFeatured(b.species ?? b.pool[0]);
    if (!b.species) this.time.addEvent({ delay: 2600, loop: true, callback: () => this.showFeatured(b.pool[(b.pool.indexOf(this.featured) + 1) % b.pool.length]) });
    this.drawInfo();
    this.drawButtons();
    this.events.on('update', () => this.tick());
    this.tick();
  }

  update(_, dt) { this.fx.update(dt); }

  showFeatured(id) {
    this.featured = id;
    this.rig?.c.destroy();
    this.rig = createRig(this, id, this.dinoX, GROUND_Y, 1, id, lp(3, 2)).addShadow();
    this.rig.c.setDepth(6);
    this.rig.startIdle();
    this.vShown = -1;
    this.nextVariant();
  }

  // Beside it, its six variants come by one at a time: a silhouette unless you own it.
  nextVariant() {
    this.vTimer?.remove();
    this.vImg?.destroy();
    this.vName?.destroy();
    const v = VARIANT_ORDER[(this.vShown = (this.vShown + 1) % VARIANT_ORDER.length)], got = ownsVariant(meta.gacha, this.featured, v);
    const x = this.dinoX + lp(52, 46), def = VARIANTS[v];
    this.vImg = this.add.image(x, GROUND_Y, ensureSkin(this, skinOf(this.featured, 0, null, v))).setOrigin(0.5, 1).setDepth(6).setAlpha(0);
    if (!got) this.vImg.setTintFill(0x0c0e12);
    this.vImg.preFX?.addGlow(def.glow, 2, 0, false, 0.1, 6);
    this.tweens.add({ targets: this.vImg, alpha: 0.9, duration: 300 });
    // Its name: below it, or above it in portrait (the panel sits under the ground there).
    this.vName = text(this, x, lp(GROUND_Y + 4, GROUND_Y - this.vImg.height - 9), got ? def.name : `${def.name}?`, { origin: [0.5, 0], small: true, color: `#${def.glow.toString(16).padStart(6, '0')}` }).setDepth(7);
    this.vTimer = this.time.delayedCall(1800, () => this.nextVariant());
  }

  drawInfo() {
    const b = this.banner, [x, y, w, h] = lp([166, 20, 150, 108], [4, 202, 172, 72]);
    const add = (o) => { (this.info ??= []).push(o); return o; }; // hidden while a reveal plays
    add(panel(this.add.graphics().setDepth(10), x, y, w, h));
    const sp = b.species ? SPECIES[b.species] : null, rar = RARITIES[b.rarity];
    const lines = [
      [b.species ? `TODAY: ${spName(b.species)}` : 'TODAY: ANY LEGENDARY', COLORS.accent, false],
      [`${rar.name}  FEATURED ${Math.round(b.rate * 100)}%`, rar.color, true],
      ...(sp ? [[`HP ${sp.hp} ATK ${sp.atk} DEF ${sp.def} SPD ${sp.spd}`, COLORS.text, true], ...lp([[`SPECIAL: ${MOVES[sp.special].name.toUpperCase()}`, COLORS.textDim, true]], [])] // portrait: no room for the special
        : [['T-REX OR CARNO, AT RANDOM', COLORS.text, true]]),
      [`${Math.round(VARIANT_SHARE * 100)}% OF HITS ARE A VARIANT`, '#9ae8ff', true]
    ];
    let ly = y + 5;
    for (const [s, color, small] of lines) { add(text(this, x + 6, ly, s, { color, small, shadow: false }).setDepth(11)); ly += small ? 8 : 11; }
    // Pity: a bar toward the guarantee.
    this.pityText = add(text(this, x + 6, ly + 1, '', { small: true, shadow: false }).setDepth(11));
    this.pityBar = add(this.add.graphics().setDepth(11));
    this.pityAt = [x + 6, ly + 8, w - 12];
    this.clockText = add(text(this, x + 6, ly + 13, '', { color: COLORS.textDim, small: true, shadow: false }).setDepth(11));
    this.owned = add(text(this, x + 6, ly + 21, '', { color: COLORS.textDim, small: true, shadow: false }).setDepth(11));
  }

  drawButtons() {
    const L = lp(
      [[4, 146, 70, 30], [77, 146, 70, 30], [150, 146, 40, 30], [193, 146, 40, 30], [236, 146, 46, 30], [285, 146, 31, 30]],
      [[4, 276, 84, 20], [92, 276, 84, 20], [4, 298, 40, 18], [47, 298, 40, 18], [90, 298, 46, 18], [139, 298, 37, 18]]
    );
    this.btns = [
      new Button(this, ...L[0], { key: '1', label: 'PULL X1', sub: '', subColor: '#e8a030', onClick: () => this.pull(1) }),
      new Button(this, ...L[1], { key: '2', label: 'PULL X10', sub: `${PRICE.ten}${AMB}`, subColor: '#e8a030', onClick: () => this.pull(10) }),
      new Button(this, ...L[2], { key: 'E', label: 'DINOS', onClick: () => this.eggs() }),
      new Button(this, ...L[3], { key: 'R', label: 'RATES', onClick: () => this.rates() }),
      new Button(this, ...L[4], { key: 'H', label: 'HISTORY', onClick: () => this.history() }),
      new Button(this, ...L[5], { key: 'ESC', label: 'BACK', onClick: () => this.leave() })
    ];
    this.nav = new FocusNav(this, { items: () => this.btns, start: 0, onBack: () => this.leave() });
    this.onKey = (e) => {
      if (e.repeat || this.busy || this.nav.handle(e)) return;
      if (e.code in PULL_KEYS) this.btns[PULL_KEYS[e.code]].click();
    };
    this.input.keyboard.on('keydown', this.onKey);
    this.events.once('shutdown', () => this.input.keyboard?.off('keydown', this.onKey));
  }

  // Every frame: the countdown (a new day restarts the screen with the new banner), the pity
  // bar, what a single pull costs right now.
  tick() {
    if (utcDay() !== this.day && !this.busy) { this.scene.restart(); return; }
    const g = meta.gacha, [px, py, pw] = this.pityAt;
    this.clockText.setText(`NEW BANNER IN ${clock(msToNextBanner())}`);
    this.pityText.setText(`PITY ${g.pity}/${PITY}  (GUARANTEED AT ${PITY})`);
    this.pityBar.clear().fillStyle(0x0c0e12).fillRect(px, py, pw, 2).fillStyle(0xffd040).fillRect(px, py, Math.round((pw * g.pity) / PITY), 2);
    this.owned.setText(`DINOS ${Object.keys(g.owned).length}   BONE SHARDS ${g.shards}`);
    const free = freeReady(g), one = this.btns[0];
    one.setText(free ? 'FREE PULL' : 'PULL X1', free ? (dailyReady(g) ? 'ONCE A DAY' : `${g.credits} LEFT`) : `${PRICE.one}${AMB}`);
  }

  async pull(n) {
    if (this.busy) return;
    const cost = pullCost(meta.gacha, n);
    if (meta.amber < cost) { sfx('deny'); this.flashText('NOT ENOUGH AMBER'); return; }
    const out = hatcheryPull(n); // paid, rolled and saved before anything is shown
    if (out.error) { sfx('deny'); this.flashText(out.error); return; }
    this.busy = true;
    this.amber.set(meta.amber);
    const show = (on) => { // the banner steps aside while the reveal plays
      this.rig.c.setVisible(on);
      for (const o of this.info) o.setVisible(on);
      if (on) this.nextVariant(); else { this.vTimer?.remove(); this.vImg?.destroy(); this.vName?.destroy(); this.vImg = this.vName = null; }
    };
    show(false);
    const at = { x: this.dinoX, ground: GROUND_Y };
    if (n === 1) await revealOne(this, out.results[0], at);
    else {
      await revealTen(this, out.results, { ...at, x: W / 2 });
      await choose(this, { title: `${n} PULLS`, lines: summary(out.results), options: [{ label: 'OK' }] });
    }
    await showGoals(this, checkGoals(null, [{ type: 'pull', results: out.results }])); // First Pull, Collector, Gold Rush...
    this.amber.set(meta.amber);
    show(true);
    this.busy = false;
  }

  flashText(s) {
    const t = text(this, W / 2, lp(130, 266), s, { origin: 0.5, color: '#ff6040' }).setDepth(30);
    this.tweens.add({ targets: t, alpha: 0, delay: 700, duration: 300, onComplete: () => t.destroy() });
  }

  // Your dinos, and buying variants with Bone Shards (ui/craftMenu.js).
  async eggs() {
    if (this.busy) return;
    this.busy = true;
    await craftMenu(this);
    this.busy = false;
  }

  async rates() {
    if (this.busy) return;
    this.busy = true;
    const b = this.banner, miss = 1 - b.rate, f = Object.fromEntries(FILLER.map((x) => [x.kind, x]));
    const vw = Object.values(VARIANTS).reduce((t, v) => t + v.weight, 0);
    await choose(this, {
      title: 'RATES',
      lines: [
        `FEATURED: ${Math.round(b.rate * 100)}% A PULL (R ${pc(FEATURED_RATE.rare)} E ${pc(FEATURED_RATE.epic)} L ${pc(FEATURED_RATE.legendary)})`,
        `VARIANT: ${pc(VARIANT_SHARE)} OF FEATURED HITS:`,
        `  ${VARIANT_ORDER.map((v) => `${VARIANTS[v].name.slice(0, 4)} ${Math.round((VARIANT_SHARE * 100 * VARIANTS[v].weight) / vw)}%`).join(' ')}`,
        `ELSE: SHARDS ${pc(miss * 0.6)}  EGG ${pc(miss * 0.35)}  AMBER ${pc(miss * 0.05)}`,
        `  SHARDS ${f.shards.min}-${f.shards.max}, AMBER ${f.refund.min}-${f.refund.max}`,
        `  EGG: COMMON 70% RARE 25% EPIC 5%`,
        'A DINO YOU HAVE: AMBER INSTEAD.',
        `PITY: THE FEATURED DINO ON PULL ${PITY}`,
        'THE PITY COUNT CARRIES OVER ALL BANNERS.',
        'NO REAL MONEY. AMBER ONLY.'
      ],
      options: [{ label: 'BACK' }]
    });
    this.busy = false;
  }

  async history() {
    if (this.busy) return;
    this.busy = true;
    const h = meta.gacha.history, per = 8;
    for (let page = 0; ;) {
      const rows = h.slice(page * per, (page + 1) * per).map((e) => `${e.kind === 'featured' ? '* ' : '  '}${resultName(e)}${e.dupe ? ` (+${e.dupe} AMBER)` : e.isNew ? ' NEW' : ''}`);
      const pages = Math.max(1, Math.ceil(h.length / per));
      const opts = [{ label: 'BACK' }, ...(pages > 1 ? [{ label: `MORE (${page + 1}/${pages})` }] : [])];
      const i = await choose(this, { title: h.length ? 'LAST PULLS' : 'NO PULLS YET', lines: rows.length ? rows : ['YOUR PULLS SHOW UP HERE.'], options: opts, bh: 20 });
      if (i !== 1) break;
      page = (page + 1) % pages;
    }
    this.busy = false;
  }

  leave() {
    if (this.busy) return;
    this.busy = true;
    this.cameras.main.fadeOut(150);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Home'));
  }
}

const pc = (k) => `${Math.round(k * 100)}%`;

// The 10-pull's summary: what came out, grouped.
function summary(results) {
  const fresh = results.filter((r) => r.isNew).map(resultName), count = {};
  for (const x of fresh) count[x] = (count[x] ?? 0) + 1;
  const shards = results.filter((r) => r.kind === 'shards').reduce((t, r) => t + r.n, 0);
  const amber = results.reduce((t, r) => t + (r.kind === 'refund' ? r.n : r.dupe ?? 0), 0);
  const dupes = results.filter((r) => r.dupe).length;
  return [
    ...Object.entries(count).map(([x, n]) => `NEW: ${x}${n > 1 ? ` X${n}` : ''}`),
    ...(shards ? [`+${shards} BONE SHARDS`] : []),
    ...(amber ? [`+${amber} AMBER${dupes ? ` (${dupes} DUPLICATE${dupes > 1 ? 'S' : ''})` : ''}`] : [])
  ];
}
