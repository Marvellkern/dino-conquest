import { syncLayout } from '../systems/screen.js';
import { W, H, COLORS, lp } from '../config.js';
import { PROGRESSION } from '../data/progression.js';
import { PERKS } from '../data/relics.js';
import { text } from '../ui/font.js';
import { createRig } from '../sprites/rig.js';
import { checkpoint } from '../systems/runStore.js';
import { session, evolve, dinoName, dinoSkin } from '../run/run.js';
import { Fx } from '../systems/fx.js';
import { sfx } from '../systems/sfx.js';
import { onPress } from '../systems/qte.js';
import { menuLight } from '../render/menuLight.js';
import { roar, wait } from '../battle/anims.js';
import { music } from '../systems/music.js';

// Stage center and floor, read per layout in create().
let X = 160, GROUND = 138;

// Evolution moment (~2.5s, tap to skip): screen dims, white silhouettes of the
// old and new forms flicker faster and faster, flash, particles, and the new
// name slams in with the form's perk.
export class Evolution extends Phaser.Scene {
  constructor() { super('Evolution'); }

  create() {
    syncLayout(this);
    X = W / 2;
    GROUND = lp(138, 210);
    this.fx = new Fx(this);
    this.skipped = false;
    this.cameras.main.fadeIn(150);
    this.drawStage();
    this.light = menuLight(this, { key: { x: X, y: -10, radius: lp(160, 140), color: 0xfff0c8, alpha: 0.2 } });
    this.play();
  }

  update(_, dt) { this.fx.update(dt); }

  // Waits that end early once the player taps to skip.
  nap(ms) {
    return this.skipped ? Promise.resolve() : Promise.race([wait(this, ms), this.skipP]);
  }

  drawStage() {
    const g = this.add.graphics();
    g.fillStyle(0x0c0e12).fillRect(0, 0, W, H);
    [[70, 0x16181d], [52, 0x1c1f26], [34, 0x22262e]].forEach(([r, c]) => {
      g.fillStyle(c);
      for (let y = 0; y < GROUND; y += 2) {
        const w = Math.round(r * (0.35 + 0.65 * (y / GROUND)));
        g.fillRect(X - w, y, w * 2, 2);
      }
    });
    g.fillStyle(0x2a2e36).fillRect(0, GROUND, W, H - GROUND);
    g.fillStyle(0x3a3f4a).fillRect(0, GROUND, W, 1);
  }

  async play() {
    const run = session.run, d = run.dino;
    checkpoint(run, { kind: 'evolve' }); // a reload replays this evolution
    const oldName = dinoName(d), oldSkin = dinoSkin(d);
    const perk = evolve(run);
    const newSkin = dinoSkin(d);

    const before = createRig(this, d.species, X, GROUND, 1, oldSkin, 3);
    const after = createRig(this, d.species, X, GROUND, 1, newSkin, 3);
    after.c.setVisible(false);
    const title = text(this, X, lp(14, 50), `${oldName} IS EVOLVING!`, { origin: [0.5, 0] });

    this.skipP = new Promise((r) => { this.offSkip = onPress(this, () => { this.skipped = true; this.offSkip(); r(); }); });
    await this.nap(450);

    // Flicker between the two silhouettes, speeding up.
    sfx('evolve');
    music.stinger('evolve'); // its held note lands on the flash
    before.setFlash(true);
    after.setFlash(true);
    let gap = 260;
    for (let i = 0; i < 8 && !this.skipped; i++) {
      const showNew = i % 2 === 0;
      before.c.setVisible(!showNew);
      after.c.setVisible(showNew);
      this.fx.shake(1 + Math.floor(i / 3), 80);
      this.motes(after, 2 + i);
      await this.nap(gap);
      gap = Math.max(50, Math.round(gap * 0.75));
    }
    this.offSkip?.(); // the skip window ends with the flicker

    // Flash + reveal.
    before.c.destroy();
    after.c.setVisible(true);
    after.setFlash(false);
    this.light.burst(after.center().x, after.center().y, 0xfff0b0, 260, 900); // the new form flares (and blooms)
    const flash = this.add.rectangle(0, 0, W, H, 0xffffff).setOrigin(0).setDepth(50);
    this.tweens.add({ targets: flash, alpha: 0, duration: 450, onComplete: () => flash.destroy() });
    sfx('boom');
    this.fx.shake(5, 400);
    const c = after.center();
    this.fx.sparks(c.x, c.y, { count: 22, dir: 1, big: true, gold: true });
    this.fx.sparks(c.x, c.y, { count: 22, dir: -1, big: true });
    title.destroy();

    // The new name slams down from above.
    const name = text(this, X, lp(-20, 20), `${dinoName(d)}!`, { scale: lp(3, 2), color: COLORS.accent, origin: [0.5, 0] });
    await new Promise((r) => this.tweens.add({ targets: name, y: '+=32', duration: 260, ease: 'Bounce.Out', onComplete: r }));
    this.fx.shake(3, 200);
    sfx('crit');

    // Details go on the floor strip, below the (big, 3x) dino.
    text(this, X, GROUND + 3, `+${Math.round(PROGRESSION.evoBoost * 100)}% ALL STATS`, { origin: [0.5, 0], color: '#7fe0ff' });
    if (perk) {
      text(this, X, GROUND + 12, `NEW PERK: ${PERKS[perk].name.toUpperCase()}`, { origin: [0.5, 0], color: '#ffd040' });
      text(this, X, GROUND + 22, PERKS[perk].desc, { origin: [0.5, 0], color: '#c0cbdc', small: true });
    }
    after.startIdle();
    if (!this.skipped) { await roar(this, after, () => {}); after.startIdle(); }
    sfx('levelup');

    const prompt = text(this, X, lp(170, H - 20), 'TAP TO CONTINUE', { origin: [0.5, 0], color: COLORS.textDim, small: true });
    this.tweens.add({ targets: prompt, alpha: 0.3, duration: 500, yoyo: true, repeat: -1 });
    await wait(this, 350);
    await new Promise((r) => { const off = onPress(this, () => { off(); r(); }); });

    const next = d.pendingEvo ? 'Evolution' : 'Map';
    this.cameras.main.fadeOut(150);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(next));
  }

  // Rising sparkles around the dino during the build-up.
  motes(rig, n) {
    const c = rig.center();
    for (let i = 0; i < n; i++) {
      const r = this.add.rectangle(c.x + Phaser.Math.Between(-44, 44), GROUND - Phaser.Math.Between(0, 20), 1, 2,
        i % 2 ? 0xfff096 : 0xffffff).setDepth(20);
      this.tweens.add({ targets: r, y: r.y - Phaser.Math.Between(30, 70), alpha: 0, duration: 600, onComplete: () => r.destroy() });
    }
  }
}
