import { W, H, COLORS } from '../config.js';
import { text } from '../ui/font.js';
import { panel } from '../ui/pixel.js';
import { makeTexture } from '../sprites/renderSprite.js';
import { SKIN_GRIDS, fossilColor } from '../sprites/skins.js';
import { session, dinoName, skinOf, zoneOf } from '../run/run.js';
import { meta, bankRun, addFossil } from '../systems/meta.js';
import { pickLineage } from '../run/lineagePick.js';
import { Fx } from '../systems/fx.js';
import { sfx } from '../systems/sfx.js';
import { onPress } from '../systems/qte.js';
import { wait } from '../battle/anims.js';

const SLAB = { x: 12, y: 34, w: 164, h: 118 };

// Death screen: the dino turns to stone in the strata, the run is summed up,
// and the fossil grants a permanent Lineage bonus.
export class Fossil extends Phaser.Scene {
  constructor() { super('Fossil'); }

  create() {
    const run = session.run;
    if (!run) { this.scene.start('Home'); return; }
    this.fx = new Fx(this);
    this.cameras.main.fadeIn(400);
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
    const skin = skinOf(d.species, d.evo);
    const amber = bankRun(run, false);
    addFossil({ species: d.species, evo: d.evo, level: d.level, zone: run.zone, col, cause: run.cause, at: Date.now() });
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

    panel(this.add.graphics(), 184, 34, 128, 118);
    const lines = [
      [dinoName(d), COLORS.text],
      [`LEVEL ${d.level}`, COLORS.textDim],
      [`${zone.name} ${col}/${zone.rows + 1}`, COLORS.textDim],
      ['FELL TO', COLORS.textDim],
      [String(run.cause ?? '???'), '#e06060'],
      [`+${amber} AMBER`, '#e8a030'],
      [`FOSSIL #${meta.fossils.length}`, '#d6c9a8']
    ];
    lines.forEach(([s, color], i) => text(this, 190, 40 + i * 15, s, { color, shadow: i === 0 }));
    await wait(this, 900);

    await pickLineage(this);

    const prompt = text(this, W / 2, 162, 'TAP TO RETURN TO THE NEST', { origin: [0.5, 0], color: COLORS.textDim, shadow: false });
    this.tweens.add({ targets: prompt, alpha: 0.3, duration: 500, yoyo: true, repeat: -1 });
    await wait(this, 300);
    await new Promise((r) => { const off = onPress(this, () => { off(); r(); }); });
    this.cameras.main.fadeOut(250);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Home'));
  }

  dust(x, y) {
    for (let i = 0; i < 8; i++) {
      const r = this.add.rectangle(x + Phaser.Math.Between(-30, 30), y + Phaser.Math.Between(-20, 20), 1, 1, 0xd6c9a8).setDepth(5);
      this.tweens.add({ targets: r, y: r.y - Phaser.Math.Between(6, 16), alpha: 0, duration: 500, onComplete: () => r.destroy() });
    }
  }
}
