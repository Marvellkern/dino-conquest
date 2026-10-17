import { W, H, COLORS } from '../config.js';
import { MOVES } from '../data/moves.js';
import { PROGRESSION } from '../data/progression.js';
import { text } from '../ui/font.js';
import { createRig } from '../sprites/rig.js';
import { session, evolve, dinoName, skinOf } from '../run/run.js';
import { Fx } from '../systems/fx.js';
import { sfx } from '../systems/sfx.js';
import { onPress } from '../systems/qte.js';
import { roar, wait } from '../battle/anims.js';

const X = W / 2, GROUND = 138;

// Evolution moment: flicker between old form and white silhouette, faster
// and faster, then a flash and the new form roars in.
export class Evolution extends Phaser.Scene {
  constructor() { super('Evolution'); }

  create() {
    this.fx = new Fx(this);
    this.cameras.main.fadeIn(300);
    this.drawStage();
    this.play();
  }

  update(_, dt) { this.fx.update(dt); }

  drawStage() {
    const g = this.add.graphics();
    g.fillStyle(0x0c0e12).fillRect(0, 0, W, H);
    // Stepped spotlight cone.
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
    const oldName = dinoName(d), oldSkin = skinOf(d.species, d.evo);
    const rig = createRig(this, d.species, X, GROUND, 1, oldSkin, 3);
    rig.startIdle();
    const title = text(this, X, 14, `${oldName} IS EVOLVING!`, { origin: [0.5, 0] });
    await wait(this, 700);

    // Flicker build-up.
    rig.stopIdle();
    sfx('evolve');
    let gap = 300, t = 0, on = false;
    while (t < 2600) {
      on = !on;
      rig.setFlash(on);
      this.fx.shake(Math.min(3, 1 + Math.floor(t / 900)), 90);
      this.motes(rig, 2 + Math.floor(t / 600));
      await wait(this, gap);
      t += gap;
      gap = Math.max(40, Math.round(gap * 0.82));
    }

    // Flash + reveal.
    const special = evolve(d);
    const flash = this.add.rectangle(0, 0, W, H, 0xffffff).setOrigin(0).setDepth(50);
    this.tweens.add({ targets: flash, alpha: 0, duration: 600, onComplete: () => flash.destroy() });
    sfx('boom');
    this.fx.shake(5, 450);
    rig.c.destroy();
    const evo = createRig(this, d.species, X, GROUND, 1, skinOf(d.species, d.evo), 3);
    const c = evo.center();
    this.fx.sparks(c.x, c.y, { count: 20, dir: 1, big: true });
    this.fx.sparks(c.x, c.y, { count: 20, dir: -1, big: true });
    title.setText('');
    await wait(this, 400);
    await roar(this, evo, () => {});
    evo.startIdle();

    text(this, X, 14, `${dinoName(d)}!`, { scale: 2, color: COLORS.accent, origin: [0.5, 0] });
    text(this, X, 34, `+${Math.round(PROGRESSION.evoBoost * 100)}% ALL STATS`, { origin: [0.5, 0], color: '#7fe0ff' });
    const moveLine = special ? `${MOVES[special].name.toUpperCase()}${'+'.repeat(d.moveUps[special])} UNLOCKED` : '';
    text(this, X, 44, moveLine, { origin: [0.5, 0], color: '#e8a030' });
    sfx('levelup');
    const prompt = text(this, X, 166, 'TAP TO CONTINUE', { origin: [0.5, 0], color: COLORS.textDim, shadow: false });
    this.tweens.add({ targets: prompt, alpha: 0.3, duration: 500, yoyo: true, repeat: -1 });
    await wait(this, 500);
    await new Promise((r) => { const off = onPress(this, () => { off(); r(); }); });

    const next = d.pendingEvo ? 'Evolution' : 'Map';
    this.cameras.main.fadeOut(250);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(next));
  }

  // Rising sparkles around the dino during the build-up.
  motes(rig, n) {
    const c = rig.center();
    for (let i = 0; i < n; i++) {
      const r = this.add.rectangle(c.x + Phaser.Math.Between(-40, 40), GROUND - Phaser.Math.Between(0, 20), 1, 2,
        i % 2 ? 0xfff096 : 0xffffff).setDepth(20);
      this.tweens.add({ targets: r, y: r.y - Phaser.Math.Between(30, 70), alpha: 0, duration: 600, onComplete: () => r.destroy() });
    }
  }
}
