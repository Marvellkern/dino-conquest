import { syncLayout } from '../systems/screen.js';
import { W, H, GROUND_Y, COLORS, lp } from '../config.js';
import { drawJungle } from '../ui/backdrop.js';
import { text } from '../ui/font.js';
import { createRig } from '../sprites/rig.js';
import { Fx } from '../systems/fx.js';
import { onPress } from '../systems/qte.js';
import { menuLight } from '../render/menuLight.js';
import { isPhone, enterFullscreen } from '../systems/screen.js';
import { sfx } from '../systems/sfx.js';
import { animSet, wait } from '../battle/anims.js';
import { hitFeedback } from '../battle/feedback.js';

// Title: the T-rex and a raptor trade blows forever behind the logo.
export class Title extends Phaser.Scene {
  constructor() { super('Title'); }

  create() {
    syncLayout(this);
    this.fx = new Fx(this);
    this.cameras.main.fadeIn(150);
    drawJungle(this);
    menuLight(this, { zone: 'jungle', key: { x: 40, y: 16, radius: 150, color: 0xffe8a0, alpha: 0.35, depth: 1.5 } }); // the jungle sun, top-left (Medium / High)
    this.alive = true;
    this.events.once('shutdown', () => { this.alive = false; });

    this.rex = { rig: createRig(this, 'rex', lp(96, 48), GROUND_Y, 1).addShadow() };
    this.raptor = { rig: createRig(this, 'raptor', lp(232, 136), GROUND_Y, -1).addShadow() };
    this.rex.rig.startIdle();
    this.raptor.rig.startIdle();

    text(this, W / 2, lp(14, 44), 'DINO-CONQUEST', { scale: lp(3, 2), color: COLORS.accent, origin: [0.5, 0] }).setDepth(30);
    text(this, W / 2, lp(42, 66), 'A PREHISTORIC ROGUELIKE', { color: COLORS.text, origin: [0.5, 0] }).setDepth(30);
    const touch = this.sys.game.device.input.touch;
    const prompt = text(this, W / 2, lp(160, H - 50), touch ? 'TAP TO START' : 'CLICK OR PRESS SPACE TO START', { origin: [0.5, 0] }).setDepth(30);
    this.tweens.add({ targets: prompt, alpha: 0.25, duration: 550, yoyo: true, repeat: -1 });

    const off = onPress(this, () => {
      off();
      if (isPhone()) enterFullscreen(); // phones: fullscreen + landscape on the first tap
      sfx('fight');
      this.cameras.main.fadeOut(150);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Home'));
    });
    this.loop();
  }

  update(_, dt) { this.fx.update(dt); }

  // Fake strike context: no QTE, always lands (crit every third hit for flair).
  ctx(att, dfd, n) {
    const res = n % 3 === 2 ? 'crit' : 'good';
    return {
      isPlayer: true, hit: 0,
      open: () => {},
      result: () => Promise.resolve(res),
      impact: () => hitFeedback(this, att, dfd, 4 + Math.floor(Math.random() * 9) + (res === 'crit' ? 8 : 0), res, 'hit')
    };
  }

  async strike(att, dfd, kind, n) {
    const set = animSet(att.rig === this.rex.rig ? 'rex' : 'raptor', kind);
    att.rig.stopIdle();
    if (set.approach) await set.approach(this, att.rig, dfd.rig);
    await set.strike(this, att.rig, dfd.rig, this.ctx(att, dfd, n));
    if (set.retreat) await set.retreat(this, att.rig);
    if (!this.alive) return;
    att.rig.setPose({});
    att.rig.setFacing(att.rig.homeFacing);
    att.rig.x = att.rig.homeX;
    att.rig.startIdle();
  }

  async loop() {
    const moves = [['rex', 'bite'], ['raptor', 'bite'], ['rex', 'tail'], ['raptor', 'tail'], ['rex', 'bigBite'], ['raptor', 'bite']];
    await wait(this, 700);
    for (let n = 0; this.alive; n++) {
      const [who, kind] = moves[n % moves.length];
      const [att, dfd] = who === 'rex' ? [this.rex, this.raptor] : [this.raptor, this.rex];
      await this.strike(att, dfd, kind, n);
      if (this.alive) await wait(this, 450);
    }
  }
}
