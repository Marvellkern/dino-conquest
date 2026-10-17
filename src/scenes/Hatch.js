import { W, COLORS } from '../config.js';
import { SPECIES } from '../data/species.js';
import { MOVES } from '../data/moves.js';
import { TRAITS } from '../data/traits.js';
import { RARITIES, REROLL_COST, SPIN_MS } from '../data/hatch.js';
import { drawNestRoom } from '../ui/backdrop.js';
import { text } from '../ui/font.js';
import { panel } from '../ui/pixel.js';
import { Button } from '../ui/button.js';
import { Reel } from '../ui/reel.js';
import { createRig } from '../sprites/rig.js';
import { makeRng, randomSeed } from '../systems/rng.js';
import { meta, persist, markHatched, owned, runSetup, hatchable } from '../systems/meta.js';
import { GOLDEN_EGG_COST } from '../data/unlocks.js';
import { checkGoals } from '../systems/goals.js';
import { showGoals } from '../ui/bloodline.js';
import { choose } from '../ui/popup.js';
import { newRun, skinOf } from '../run/run.js';
import { Fx } from '../systems/fx.js';
import { sfx } from '../systems/sfx.js';
import { onPress } from '../systems/qte.js';
import { roar, wait } from '../battle/anims.js';

const DINO_X = 76;
const GROUND = 128;
const PX = 158; // info panel content left edge

// Egg → species spin → trait spin → reroll or start a run.
export class Hatch extends Phaser.Scene {
  constructor() { super('Hatch'); }

  create() {
    this.rng = makeRng(randomSeed());
    this.fx = new Fx(this);
    this.rig = null;
    this.busy = true;
    this.cameras.main.fadeIn(150);
    this.free = owned('whisper'); // Egg Whisper: free rerolls this hatch
    this.golden = false;
    this.setup = runSetup();

    drawNestRoom(this, DINO_X, GROUND);
    text(this, 6, 6, 'HATCHERY', { color: COLORS.accent });
    this.amberText = text(this, W - 6, 6, '', { color: '#e8a030', origin: [1, 0] });

    panel(this.add.graphics().setDepth(10), 152, 20, 164, 116);
    text(this, PX, 25, 'SPECIES', { color: COLORS.textDim, small: true }).setDepth(11);
    this.speciesReel = new Reel(this, PX, 35, 152, 32, (id, y) => this.speciesCell(id, y));
    this.stats = text(this, PX, 73, '', { shadow: false }).setDepth(11);
    this.special = text(this, PX, 82, '', { color: COLORS.textDim, small: true }).setDepth(11);
    text(this, PX, 93, 'TRAIT', { color: COLORS.textDim, small: true }).setDepth(11);
    this.traitReel = new Reel(this, PX, 102, 152, 14, (id, y) => this.traitCell(id, y));
    this.traitDesc = text(this, PX, 123, '', { color: COLORS.textDim, small: true }).setDepth(11);

    const bw = 101, by = 144;
    this.buttons = [
      new Button(this, 4, by, bw, 32, { key: '1', label: 'REROLL DINO', sub: `${REROLL_COST.species} AMBER`, onClick: () => this.rerollSpecies() }),
      new Button(this, 4 + (bw + 4), by, bw, 32, { key: '2', label: 'REROLL TRAIT', sub: `${REROLL_COST.trait} AMBER`, onClick: () => this.rerollTrait() }),
      new Button(this, 4 + 2 * (bw + 4), by, bw, 32, {
        key: '3', label: 'START RUN', sub: this.setup.ext ? `EXTINCTION ${this.setup.ext}` : 'THE JUNGLE', onClick: () => this.go()
      })
    ];
    this.onKey = (e) => {
      const i = '123'.indexOf(e.key);
      if (!e.repeat && i >= 0) this.buttons[i].click();
    };
    this.input.keyboard.on('keydown', this.onKey);
    this.events.once('shutdown', () => this.input.keyboard?.off('keydown', this.onKey));
    this.refresh();

    // The egg waits in the nest, wobbling now and then.
    this.egg = this.add.image(DINO_X, GROUND - 2, 'egg').setOrigin(0.5, 1).setScale(2).setDepth(5);
    this.wobble = 1;
    this.eggTimer = this.time.addEvent({ delay: 60, loop: true, callback: () => this.wobbleEgg() });
    this.hint = text(this, DINO_X, 30, 'TAP TO HATCH', { origin: 0.5 }).setDepth(12);
    this.tweens.add({ targets: this.hint, alpha: 0.3, duration: 500, yoyo: true, repeat: -1 });
    if (this.setup.heir) text(this, DINO_X, 14, `HEIR OF ${this.setup.heir.name.toUpperCase()}`, { origin: [0.5, 0], color: '#e8a030', shadow: false }).setDepth(12);
    const off = onPress(this, () => { off(); this.hatch(); });
  }

  update(_, dt) { this.fx.update(dt); }

  /* ---------- rolls ---------- */

  // golden: the Golden Egg skips Common.
  rollSpecies(golden = this.golden) {
    const odds = Object.entries(RARITIES).filter(([k]) => !golden || k !== 'common');
    let r = this.rng.next() * odds.reduce((t, [, v]) => t + v.odds, 0), rarity = odds[0][0];
    for (const [k, v] of odds) {
      if (r < v.odds) { rarity = k; break; }
      r -= v.odds;
    }
    const pool = hatchable();
    return this.rng.pick(pool.filter((id) => SPECIES[id].rarity === rarity));
  }

  rollTrait(not) {
    return this.rng.pick(Object.keys(TRAITS).filter((t) => t !== not));
  }

  // Filler cells for the reel, then the real result last.
  strip(pool, result, n) {
    return [...Array.from({ length: n }, () => this.rng.pick(pool)), result];
  }

  /* ---------- reel cells ---------- */

  speciesCell(id, y) {
    const sp = SPECIES[id], rar = RARITIES[sp.rarity];
    const icon = this.add.image(20, y + 16, id).setOrigin(0.5); // x=20 keeps the 37px Spino inside the cell
    return [
      icon,
      text(this, 40, y + 7, sp.name),
      text(this, 40, y + 19, rar.name, { color: rar.color, small: true })
    ];
  }

  traitCell(id, y) {
    return [text(this, 76, y + 7, TRAITS[id].name, { color: '#e8a030', origin: 0.5 })];
  }

  /* ---------- flow ---------- */

  wobbleEgg() {
    if (!this.egg) return;
    const t = this.time.now;
    const shaking = this.wobble > 1 || Math.floor(t / 900) % 3 === 0;
    this.egg.x = DINO_X + (shaking ? (Math.floor(t / 60) % 2 ? this.wobble : -this.wobble) : 0);
  }

  // Twin Clutch: pick 1 of 2 eggs (rarity shows). Golden Egg: pay for Rare or better.
  // Returns a species, or null to roll one normally.
  async chooseEgg() {
    const twin = owned('twinClutch'), gold = owned('egg:golden');
    if (!twin && !gold) return null;
    const eggs = twin ? [this.rollSpecies(false), this.rollSpecies(false)] : [null];
    const options = eggs.map((sp, i) => (sp
      ? { label: `EGG ${i + 1}`, sub: `A ${RARITIES[SPECIES[sp].rarity].name} EGG` }
      : { label: 'PLAIN EGG', sub: 'ANY RARITY' }));
    if (gold) options.push({ label: 'GOLDEN EGG', sub: `RARE OR BETTER - ${GOLDEN_EGG_COST} AMBER`, disabled: meta.amber < GOLDEN_EGG_COST ? `NEED ${GOLDEN_EGG_COST} AMBER` : null });
    const i = await choose(this, { title: 'CHOOSE AN EGG', options });
    if (i < eggs.length) return eggs[i];
    meta.amber -= GOLDEN_EGG_COST;
    persist();
    this.golden = true;
    this.egg.setTint(0xffd040);
    this.refresh();
    return null;
  }

  // Waits that end early once the player taps to skip the hatch.
  nap(ms) { return this.skipping ? Promise.resolve() : Promise.race([wait(this, ms), this.skipP]); }

  async hatch() {
    this.hint.destroy();
    this.species = (await this.chooseEgg()) ?? this.rollSpecies();
    this.skipping = false;
    this.skipP = new Promise((r) => {
      this.offSkip = onPress(this, () => {
        this.skipping = true;
        this.speciesReel.skip();
        this.traitReel.skip();
        r();
      });
    });
    this.trait = this.rollTrait();
    this.wobble = 2;
    const spin = this.speciesReel.spin(this.strip(hatchable(), this.species, 14), SPIN_MS.species);
    for (let s = 1; s <= 3; s++) {
      await this.nap(SPIN_MS.species / 4);
      this.egg.setTexture(`egg_crack${s}`);
      sfx('tell');
      this.fx.shake(1, 80);
    }
    await spin;
    this.burstEgg();
    await this.reveal();
    await this.spinTrait();
    this.offSkip();
    this.skipping = false;
    await showGoals(this, checkGoals(null, [{ type: 'hatch' }]));
    this.busy = false;
    this.refresh();
  }

  burstEgg() {
    this.eggTimer.remove();
    const { x, y } = this.egg;
    this.egg.destroy();
    this.egg = null;
    this.flash();
    sfx('crit');
    this.fx.shake(3, 220);
    const colors = [0xe8dcb8, 0xb8a880, 0x7a9a50];
    for (let i = 0; i < 10; i++) {
      const r = this.add.rectangle(x, y - 18, 3, 2, colors[i % 3]).setDepth(7);
      const a = -Math.PI * (0.1 + 0.8 * Math.random());
      this.tweens.add({ targets: r, x: x + Math.cos(a) * 34, y: y - 18 + Math.sin(a) * 26, duration: 260, ease: 'Quad.Out' });
      this.tweens.add({ targets: r, y: GROUND - 2, alpha: 0, delay: 260, duration: 300, ease: 'Quad.In', onComplete: () => r.destroy() });
    }
  }

  flash() {
    const f = this.add.rectangle(0, 0, W, 180, 0xffffff).setOrigin(0).setDepth(50);
    this.tweens.add({ targets: f, alpha: 0, duration: 220, onComplete: () => f.destroy() });
  }

  // New dino appears in the nest and roars; rarity is announced.
  async reveal() {
    const sp = SPECIES[this.species], rar = RARITIES[sp.rarity];
    this.rig = createRig(this, this.species, DINO_X, GROUND - 4, 1, skinOf(this.species, 0, this.skin()));
    markHatched(this.species);
    this.speciesReel.setBorder(parseInt(rar.color.slice(1), 16));
    this.stats.setText(`HP ${sp.hp} ATK ${sp.atk} DEF ${sp.def} SPD ${sp.spd}`);
    this.special.setText(`SPECIAL: ${MOVES[sp.special].name}`);
    const big = sp.rarity === 'epic' || sp.rarity === 'legendary';
    this.fx.pop(DINO_X, 34, `${rar.name}!`, rar.color, big ? 2 : 1, 1600);
    if (sp.rarity === 'legendary') { sfx('win'); this.fx.shake(4, 400); }
    if (!this.skipping) await roar(this, this.rig, () => {});
    this.rig.startIdle();
  }

  async spinTrait(not) {
    this.traitDesc.setText('');
    this.traitReel.setBorder(0x0c0e12);
    await this.traitReel.spin(this.strip(Object.keys(TRAITS), this.trait, 9), SPIN_MS.trait);
    this.traitReel.setBorder(0xe8a030);
    this.traitDesc.setText(TRAITS[this.trait].desc);
    const p = this.rig.top();
    this.fx.sparks(p.x, p.y + 10, { count: 10, big: true });
  }

  // Free rerolls are used before Amber.
  pay(cost) {
    if (this.busy) return false;
    if (this.free > 0) this.free--;
    else if (meta.amber >= cost) { meta.amber -= cost; persist(); }
    else return false;
    this.busy = true;
    this.refresh();
    return true;
  }

  async rerollSpecies() {
    if (!this.pay(REROLL_COST.species)) return;
    const p = this.rig.center();
    this.rig.c.destroy();
    this.fx.sparks(p.x, p.y, { count: 14, big: true });
    sfx('whoosh');
    this.species = this.rollSpecies();
    this.stats.setText('');
    this.special.setText('');
    await this.speciesReel.spin(this.strip(hatchable(), this.species, 14), SPIN_MS.species);
    this.flash();
    this.fx.shake(2, 160);
    await this.reveal();
    this.busy = false;
    this.refresh();
  }

  async rerollTrait() {
    if (!this.pay(REROLL_COST.trait)) return;
    this.trait = this.rollTrait(this.trait);
    await this.spinTrait();
    this.busy = false;
    this.refresh();
  }

  skin() { return this.species === 'rex' && owned('skin:alpha') ? 'alpha' : null; }

  go() {
    if (this.busy) return;
    this.busy = true; // ignore repeat clicks during the fade
    newRun({ ...runSetup(), species: this.species, trait: this.trait, seed: randomSeed(), skin: this.skin() });
    meta.heir = null; // the heir's item is now in this run
    persist();
    this.cameras.main.fadeOut(150);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Map'));
  }

  refresh() {
    this.amberText.setText(`AMBER ${meta.amber}`);
    const [bs, bt, bg] = this.buttons;
    const price = (c) => (this.free > 0 ? `FREE (${this.free})` : `${c} AMBER`);
    bs.setText(null, price(REROLL_COST.species)).setEnabled(!this.busy && (this.free > 0 || meta.amber >= REROLL_COST.species));
    bt.setText(null, price(REROLL_COST.trait)).setEnabled(!this.busy && (this.free > 0 || meta.amber >= REROLL_COST.trait));
    bg.setEnabled(!this.busy);
  }
}
