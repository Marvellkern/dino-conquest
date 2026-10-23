import { syncLayout } from '../systems/screen.js';
import { W, H, GROUND_Y, COLORS, lp } from '../config.js';
import { ZONES } from '../data/zones.js';
import { zoneBackdrop } from '../ui/zoneArt.js';
import { menuLight } from '../render/menuLight.js';
import { text } from '../ui/font.js';
import { createRig } from '../sprites/rig.js';
import { session, dinoSkin } from '../run/run.js';
import { Fx } from '../systems/fx.js';
import { sfx } from '../systems/sfx.js';
import { onPress } from '../systems/qte.js';
import { roar, wait } from '../battle/anims.js';
import { music } from '../systems/music.js';
import { trackFor } from '../data/music.js';

// A ~3s cutscene each time a run reaches a new zone (Map starts it once per
// zone): letterbox bars, the dino walks in, the zone's boss looms as a
// silhouette, the zone's name slams in with its tagline, a zone flourish.
// Tap to skip. Then the zone map.
export class ZoneIntro extends Phaser.Scene {
  constructor() { super('ZoneIntro'); }

  create() {
    syncLayout(this);
    const run = session.run;
    if (!run) { this.scene.start('Home'); return; }
    music.play(trackFor(run.zone));
    music.setLayer('map');
    this.fx = new Fx(this);
    this.done = false;
    this.skipped = false; // the scene object is reused: a tap on the last intro must not skip this one
    this.cameras.main.fadeIn(150);
    this.play(run);
  }

  update(_, dt) { this.fx.update(dt); }

  // Waits that end early on a tap.
  nap(ms) { return this.skipped ? Promise.resolve() : Promise.race([wait(this, ms), this.skipP]); }

  async play(run) {
    const zone = ZONES[run.zone], n = run.zones.indexOf(run.zone) + 1;
    this.skipP = new Promise((r) => { this.offSkip = onPress(this, () => { this.skipped = true; r(); }); });
    zoneBackdrop(this, run.zone, { progress: 0, baked: true }); // the zone as its fights look (baked on Medium / High)
    menuLight(this, { zone: run.zone });

    // Cinematic bars slide in.
    const bar = lp(22, 40);
    const top = this.add.rectangle(0, -bar, W, bar, 0x0c0e12).setOrigin(0).setDepth(40);
    const bot = this.add.rectangle(0, H, W, bar, 0x0c0e12).setOrigin(0).setDepth(40);
    this.tweens.add({ targets: top, y: 0, duration: 260, ease: 'Quad.Out' });
    this.tweens.add({ targets: bot, y: H - bar, duration: 260, ease: 'Quad.Out' });

    // The boss looms far off: a dark silhouette that lightning reveals.
    const b = zone.boss;
    const boss = createRig(this, b.species, lp(W - 60, W - 40), GROUND_Y - lp(18, 30), -1, b.skin ?? b.species, lp(2, 1));
    boss.c.setDepth(3).setAlpha(0);
    for (const p of boss.parts) p.setTintFill(0x0c0e12);

    // The dino walks in from the left.
    const d = run.dino, scale = 2;
    const rig = createRig(this, d.species, -40, GROUND_Y, 1, dinoSkin(d), scale).addShadow();
    const stopX = lp(70, 60);
    this.walk(rig, stopX, 1100);
    await this.nap(500);
    this.flourish(run.zone);
    await this.nap(500);

    // Lightning: the boss flashes into view, then sinks back into shadow.
    sfx('boom');
    const flash = this.add.rectangle(0, 0, W, H, 0xffffff, 0.6).setOrigin(0).setDepth(39);
    this.tweens.add({ targets: flash, alpha: 0, duration: 220, onComplete: () => flash.destroy() });
    boss.c.setAlpha(1);
    this.tweens.add({ targets: boss.c, alpha: 0.55, duration: 900, delay: 200 });
    this.fx.shake(2, 200);
    await this.nap(250);

    // Title card: "ZONE n", then the name slams down, then the tagline.
    const ty = lp(40, 92);
    const band = this.add.rectangle(0, ty - 18, W, lp(52, 52), 0x0c0e12, 0.55).setOrigin(0).setDepth(40).setScale(1, 0);
    this.tweens.add({ targets: band, scaleY: 1, duration: 160, ease: 'Quad.Out' });
    const small = text(this, W / 2, ty - 14, `ZONE ${n}${run.ext ? `  EXTINCTION ${run.ext}` : ''}`, { origin: [0.5, 0], color: COLORS.textDim }).setDepth(41).setAlpha(0);
    this.tweens.add({ targets: small, alpha: 1, duration: 200 });
    const name = text(this, W / 2, ty - 40, zone.name, { scale: lp(3, 2), color: COLORS.accent, origin: [0.5, 0] }).setDepth(41);
    this.tweens.add({ targets: name, y: `+=${40}`, duration: 260, ease: 'Bounce.Out' });
    sfx('crit');
    await this.nap(300);
    this.fx.shake(3, 180);
    const tag = text(this, W / 2, ty + lp(24, 20), zone.intro ?? '', { origin: [0.5, 0], color: COLORS.text }).setDepth(41).setAlpha(0);
    this.tweens.add({ targets: tag, alpha: 1, duration: 250 });

    if (!this.skipped) await roar(this, rig, () => {});
    rig.startIdle();
    const prompt = text(this, W / 2, H - bar + Math.floor((bar - 7) / 2), 'TAP TO CONTINUE', { origin: [0.5, 0], color: COLORS.textDim, small: true }).setDepth(41);
    this.tweens.add({ targets: prompt, alpha: 0.3, duration: 450, yoyo: true, repeat: -1 });
    await this.nap(1100);
    this.leave();
  }

  // Step-bobbing walk with dust puffs.
  walk(rig, x, ms) {
    rig.stopIdle();
    this.tweens.add({ targets: rig.c, x, duration: ms, ease: 'Sine.Out' });
    let i = 0;
    const steps = this.time.addEvent({
      delay: 140, repeat: Math.floor(ms / 140) - 1,
      callback: () => {
        i++;
        rig.c.y = rig.homeY - (i % 2);
        if (i % 2 === 0) { sfx('step'); this.fx.dust(rig.x - 6, rig.homeY, 3); }
      }
    });
    this.time.delayedCall(ms + 20, () => { steps.remove(); rig.c.y = rig.homeY; rig.homeX = rig.x; });
  }

  // One zone-specific touch.
  flourish(zone) {
    const fx = this.fx;
    if (zone === 'jungle') { // a burst of leaves from the canopy
      for (let i = 0; i < 14; i++) {
        const r = this.add.rectangle(Phaser.Math.Between(10, W - 10), Phaser.Math.Between(lp(20, 40), lp(50, 110)), 2, 1, i % 2 ? 0x63c74d : 0x3e8948).setDepth(20);
        this.tweens.add({ targets: r, y: r.y + 60, x: r.x + Phaser.Math.Between(-20, 20), alpha: 0, duration: 1400 + i * 40, ease: 'Sine.In', onComplete: () => r.destroy() });
      }
    } else if (zone === 'swamp') { // a fog bank rolls across
      const fog = this.add.rectangle(-W, GROUND_Y - 30, W, 26, 0xc0cbdc, 0.18).setOrigin(0).setDepth(20);
      this.tweens.add({ targets: fog, x: W, duration: 2400, onComplete: () => fog.destroy() });
    } else if (zone === 'volcano') { // the ground rumbles, embers burst up
      sfx('growl');
      fx.shake(2, 700);
      for (let i = 0; i < 16; i++) {
        const r = this.add.rectangle(Phaser.Math.Between(0, W), GROUND_Y, 1, 1, i % 2 ? 0xf77622 : 0xfeae34).setDepth(20);
        this.tweens.add({ targets: r, y: r.y - Phaser.Math.Between(40, 90), alpha: 0, duration: 900 + i * 30, ease: 'Quad.Out', onComplete: () => r.destroy() });
      }
    } else if (zone === 'coast') { // a wave rolls in over the shore
      sfx('whoosh');
      const wave = this.add.rectangle(-W, GROUND_Y - 6, W, 10, 0x8bc8e8, 0.35).setOrigin(0).setDepth(20);
      const foam = this.add.rectangle(-W, GROUND_Y - 7, W, 1, 0xffffff, 0.7).setOrigin(0).setDepth(20);
      this.tweens.add({ targets: [wave, foam], x: W, duration: 1600, ease: 'Sine.InOut', onComplete: () => { wave.destroy(); foam.destroy(); } });
    } else if (zone === 'crater') { // a meteor streaks across the sky
      sfx('whoosh');
      const m = this.add.rectangle(W + 10, lp(28, 50), 4, 2, 0xfee761).setDepth(20);
      this.tweens.add({
        targets: m, x: -20, y: lp(70, 120), duration: 700, ease: 'Quad.In',
        onUpdate: () => { const t = this.add.rectangle(m.x, m.y, 2, 1, 0xf77622).setDepth(19); this.tweens.add({ targets: t, alpha: 0, duration: 300, onComplete: () => t.destroy() }); },
        onComplete: () => m.destroy()
      });
    }
  }

  leave() {
    if (this.done) return;
    this.done = true;
    this.offSkip?.();
    this.cameras.main.fadeOut(150);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Map'));
  }
}
