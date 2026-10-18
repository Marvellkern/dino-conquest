import { syncLayout } from '../systems/screen.js';
import { W, H, COLORS, lp } from '../config.js';
import { text } from '../ui/font.js';
import { panel } from '../ui/pixel.js';
import { makeTexture } from '../sprites/renderSprite.js';
import { SKIN_GRIDS, fossilColor } from '../sprites/skins.js';
import { session, dinoName, dinoSkin, zoneOf } from '../run/run.js';
import { meta, bankRun, addAncestor } from '../systems/meta.js';
import { pickHeir, endGoals } from '../ui/bloodline.js';
import { Fx } from '../systems/fx.js';
import { sfx } from '../systems/sfx.js';
import { onPress } from '../systems/qte.js';
import { wait } from '../battle/anims.js';

// The rock slab and the summary panel: side by side, or stacked in portrait.
let SLAB = { x: 12, y: 34, w: 164, h: 118 };
const BOXES = () => lp({ slab: { x: 12, y: 34, w: 164, h: 118 }, panel: [184, 34, 128, 118] },
  { slab: { x: 8, y: 30, w: 164, h: 118 }, panel: [8, 154, 164, 116] });

// Death screen: the dino turns to stone in the strata, the run is summed up,
// goals are checked, and the dino passes one fossil or mutation to its heir.
export class Fossil extends Phaser.Scene {
  constructor() { super('Fossil'); }

  create() {
    syncLayout(this);
    SLAB = BOXES().slab;
    const run = session.run;
    if (!run) { this.scene.start('Home'); return; }
    this.fx = new Fx(this);
    this.cameras.main.fadeIn(150);
    this.play(run);
  }

  update(_, dt) { this.fx.update(dt); }

  drawStrata() {
    const g = this.add.graphics();
    g.fillStyle(0x16181d).fillRect(0, 0, W, H);
    const { x, y, w, h } = SLAB;
    g.fillStyle(0x0c0e12).fillRect(x - 1, y - 1, w + 2, h + 2);
    const bands = [0x4a3a26, 0x5a4630, 0x3e3020, 0x564228, 0x46362a, 0x5e4a32];
    for (let i = 0; i < bands.length; i++) g.fillStyle(bands[i]).fillRect(x, y + Math.round((i * h) / bands.length), w, Math.ceil(h / bands.length));
    g.fillStyle(0x2e2418);
    for (let i = 0; i < 60; i++) g.fillRect(x + ((i * 37) % (w - 3)), y + ((i * 53) % (h - 2)), 2 + (i % 2), 1);
  }

  async play(run) {
    const d = run.dino, zone = zoneOf(run);
    const col = run.at ? run.map.nodes[run.at].row + 1 : 0;
    const skin = dinoSkin(d);
    const amber = bankRun(run, false);
    session.run = null;

    this.drawStrata();
    text(this, W / 2, 8, 'FOSSILIZED', { scale: 2, color: '#d6c9a8', origin: [0.5, 0] });

    // Living sprite fades into its stone cast.
    const key = `${skin}_fossil`;
    if (!this.textures.exists(key)) makeTexture(this, key, SKIN_GRIDS[skin], fossilColor);
    const cx = SLAB.x + SLAB.w / 2, cy = SLAB.y + SLAB.h / 2 + 6;
    const alive = this.add.image(cx, cy, skin).setScale(2);
    const stone = this.add.image(cx, cy, key).setScale(2).setAlpha(0);
    await wait(this, 500);
    sfx('lose');
    this.tweens.add({ targets: alive, alpha: 0, duration: 900 });
    this.tweens.add({ targets: stone, alpha: 1, duration: 900 });
    for (let i = 0; i < 4; i++) {
      this.fx.shake(1, 120);
      this.dust(cx, cy);
      await wait(this, 220);
    }

    const [px, py, pw, ph] = BOXES().panel;
    panel(this.add.graphics(), px, py, pw, ph);
    const lines = [
      [dinoName(d), COLORS.text],
      [`LEVEL ${d.level}`, COLORS.textDim],
      [`${zone.name} ${col}/${zone.rows + 1}`, COLORS.textDim],
      ['FELL TO', COLORS.textDim],
      [String(run.cause ?? '???'), '#e06060'],
      [`+${amber} AMBER`, '#e8a030'],
      [`GENERATION ${meta.stats.gens + 1}`, '#d6c9a8']
    ];
    lines.forEach(([s, color], i) => text(this, px + 6, py + 6 + i * 15, s, { color, shadow: i === 0 }));
    await wait(this, 900);

    await endGoals(this, run, false);
    addAncestor(run, false, await pickHeir(this, run));

    const prompt = text(this, W / 2, H - 18, lp('TAP TO RETURN TO THE NEST', 'TAP TO RETURN'), { origin: [0.5, 0], color: COLORS.textDim, shadow: false });
    this.tweens.add({ targets: prompt, alpha: 0.3, duration: 500, yoyo: true, repeat: -1 });
    await wait(this, 300);
    await new Promise((r) => { const off = onPress(this, () => { off(); r(); }); });
    this.cameras.main.fadeOut(150);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Home'));
  }

  dust(x, y) {
    for (let i = 0; i < 8; i++) {
      const r = this.add.rectangle(x + Phaser.Math.Between(-30, 30), y + Phaser.Math.Between(-20, 20), 1, 1, 0xd6c9a8).setDepth(5);
      this.tweens.add({ targets: r, y: r.y - Phaser.Math.Between(6, 16), alpha: 0, duration: 500, onComplete: () => r.destroy() });
    }
  }
}
