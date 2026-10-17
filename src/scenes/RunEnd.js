import { W, COLORS } from '../config.js';
import { text } from '../ui/font.js';
import { panel } from '../ui/pixel.js';
import { createRig } from '../sprites/rig.js';
import { session, dinoName, skinOf, zoneOf } from '../run/run.js';
import { bankRun } from '../systems/meta.js';
import { pickLineage } from '../run/lineagePick.js';
import { sfx } from '../systems/sfx.js';
import { onPress } from '../systems/qte.js';
import { wait } from '../battle/anims.js';

// Victory screen after the final zone's boss: banks the Amber, sums up the run
// and grants CLEAR_PICKS Lineage bonuses. (Deaths go to the Fossil screen.)
const CLEAR_PICKS = 2;
export class RunEnd extends Phaser.Scene {
  constructor() { super('RunEnd'); }

  async create(data) {
    const run = session.run;
    if (!run) { this.scene.start('Home'); return; }
    const d = run.dino, won = !!data.won, zone = zoneOf(run);
    const col = run.at ? run.map.nodes[run.at].row + 1 : 0;
    const amber = bankRun(run, won);
    session.run = null;

    this.cameras.main.fadeIn(300);
    this.add.graphics().fillStyle(0x16181d).fillRect(0, 0, W, 180);
    panel(this.add.graphics(), 40, 12, 240, 150);
    text(this, W / 2, 20, won ? 'RUN CLEARED!' : 'YOUR DINO FELL', { scale: 2, color: won ? COLORS.accent : '#e06060', origin: [0.5, 0] });

    const rig = createRig(this, d.species, 92, 112, 1, skinOf(d.species, d.evo));
    if (won) rig.startIdle();
    else rig.c.setAlpha(0.5);

    const lines = [
      [`${dinoName(d)}`, COLORS.text],
      [`LEVEL ${d.level}`, COLORS.textDim],
      [`${zone.name} ${col}/${zone.rows + 1}`, COLORS.textDim],
      won ? [`${zone.boss.name.toUpperCase()} DEFEATED`, '#7fe0ff'] : [`FELL TO ${String(run.cause ?? '???').toUpperCase()}`, '#e06060'],
      [`+${amber} AMBER`, '#e8a030']
    ];
    lines.forEach(([s, color], i) => text(this, 140, 52 + i * 14, s, { color }));
    sfx(won ? 'win' : 'lose');

    if (won) {
      await wait(this, 1200);
      for (let i = 1; i <= CLEAR_PICKS; i++) {
        const picked = await pickLineage(this, { title: `CHAMPION BONUS ${i}/${CLEAR_PICKS}`, lines: ['YOUR BLOODLINE GROWS STRONGER:'] });
        if (!picked) break;
      }
    }

    const prompt = text(this, W / 2, 148, 'TAP TO RETURN TO THE NEST', { origin: [0.5, 0], color: COLORS.textDim, shadow: false });
    this.tweens.add({ targets: prompt, alpha: 0.3, duration: 500, yoyo: true, repeat: -1 });
    await wait(this, 600);
    await new Promise((r) => { const off = onPress(this, () => { off(); r(); }); });
    this.cameras.main.fadeOut(250);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Home'));
  }
}
