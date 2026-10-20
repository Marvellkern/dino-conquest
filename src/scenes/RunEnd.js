import { syncLayout } from '../systems/screen.js';
import { AMB } from '../ui/amber.js';
import { W, H, COLORS, lp } from '../config.js';
import { text } from '../ui/font.js';
import { panel } from '../ui/pixel.js';
import { createRig } from '../sprites/rig.js';
import { session, dinoName, dinoSkin, zoneOf } from '../run/run.js';
import { bankRun, addAncestor } from '../systems/meta.js';
import { checkpoint, clearRun } from '../systems/runStore.js';
import { pickHeir, endGoals } from '../ui/bloodline.js';
import { showRunStats } from '../ui/runStats.js';
import { sfx } from '../systems/sfx.js';
import { onPress } from '../systems/qte.js';
import { wait } from '../battle/anims.js';
import { music } from '../systems/music.js';

// Victory screen after the final zone's boss: banks the Amber, sums up the run,
// checks goals, and the champion passes a fossil or mutation to its heir.
// (Deaths go to the Fossil screen.)
export class RunEnd extends Phaser.Scene {
  constructor() { super('RunEnd'); }

  async create(data) {
    syncLayout(this);
    const run = session.run;
    if (!run) { this.scene.start('Home'); return; }
    const d = run.dino, won = !!data.won, zone = zoneOf(run);
    music.setLayer('full');
    music.stinger(won ? 'victory' : 'defeat', { then: 'nest' });
    const col = run.at ? run.map.nodes[run.at].row + 1 : 0;
    // Banked once: a reload on this screen resumes here without banking again.
    if (run.banked == null) { run.banked = bankRun(run, won); checkpoint(run, { kind: 'end', won }); }
    const amber = run.banked;
    session.run = null;

    this.cameras.main.fadeIn(150);
    this.add.graphics().fillStyle(0x16181d).fillRect(0, 0, W, H);
    panel(this.add.graphics(), ...lp([40, 12, 240, 150], [4, 12, 172, 272]));
    text(this, W / 2, 20, won ? 'RUN CLEARED!' : 'YOUR DINO FELL', { scale: 2, color: won ? COLORS.accent : '#e06060', origin: [0.5, 0] });

    const rig = createRig(this, d.species, lp(92, 90), lp(112, 112), 1, dinoSkin(d));
    if (won) rig.startIdle();
    else rig.c.setAlpha(0.5);

    const lines = [
      [`${dinoName(d)}`, COLORS.text],
      [`LEVEL ${d.level}`, COLORS.textDim],
      [`${zone.name} ${col}/${zone.rows + 1}`, COLORS.textDim],
      won ? [`${zone.boss.name.toUpperCase()} DEFEATED`, '#7fe0ff'] : [`FELL TO ${String(run.cause ?? '???').toUpperCase()}`, '#e06060'],
      [`+${amber}${AMB}`, '#e8a030']
    ];
    if (run.ext) lines.splice(4, 0, [`EXTINCTION ${run.ext} CLEARED`, '#ff8060']);
    lines.forEach(([s, color], i) => text(this, lp(140, 14), lp(52, 130) + i * 14, s, { color }));
    sfx(won ? 'win' : 'lose');

    await wait(this, 1200);
    await showRunStats(this, run);
    await endGoals(this, run, won);
    addAncestor(run, won, await pickHeir(this, run));
    clearRun(); // everything is banked: the run save goes

    const prompt = text(this, W / 2, lp(148, 266), lp('TAP TO RETURN TO THE NEST', 'TAP TO RETURN'), { origin: [0.5, 0], color: COLORS.textDim, shadow: false });
    this.tweens.add({ targets: prompt, alpha: 0.3, duration: 500, yoyo: true, repeat: -1 });
    await wait(this, 600);
    await new Promise((r) => { const off = onPress(this, () => { off(); r(); }); });
    this.cameras.main.fadeOut(150);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Home'));
  }
}
