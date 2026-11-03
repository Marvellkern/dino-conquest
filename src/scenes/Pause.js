import { render } from '../render/quality.js';
import { W, H } from '../config.js';
import { meta, persist, applySettings } from '../systems/meta.js';
import { session } from '../run/run.js';
import { quickSave } from '../systems/runStore.js';
import { music } from '../systems/music.js';
import { sfx } from '../systems/sfx.js';
import { choose } from '../ui/popup.js';
import { soundMenu } from '../ui/soundMenu.js';
import { showRunStats } from '../ui/runStats.js';

// The pause menu: an overlay scene launched over Battle or the Map (ui/pauseButton.js).
// The scene underneath is paused, so its clock, tweens and QTEs stop. Its popups aren't
// run popups (ui/popup.js), so nothing here goes into the run's replay log.
export class Pause extends Phaser.Scene {
  constructor() { super('Pause'); }

  init(data) { this.from = data.from; }

  create() {
    // Not syncLayout / applyRender: a layout or render-scale change waiting for the next scene
    // (Esc also leaves fullscreen, which resizes the window) must not resize the game under
    // the paused scene. Just match the current render scale.
    this.cameras.main.setOrigin(0, 0).setZoom(render.rs);
    this.scene.pause(this.from);
    this.scene.bringToTop();
    music.setDim(true);
    sfx('blip');
    this.add.rectangle(0, 0, W, H, 0x000000, 0.35).setOrigin(0);
    this.menu();
  }

  async menu() {
    const s = meta.settings;
    for (;;) {
      const items = [
        ['resume', { label: 'RESUME' }],
        ['sound', { label: 'SOUND', sub: s.sfx ? `MUSIC ${s.music}  SFX ${s.sfxVol}` : 'OFF' }],
        ['shake', { label: `SCREEN SHAKE: ${s.shake ? 'ON' : 'OFF'}` }],
        ['aim', { label: `COUNTER AIM: ${s.aim === 'auto' ? 'AUTO' : 'MANUAL'}` }],
        ...(session.run ? [['stats', { label: 'RUN STATS' }]] : []),
        ['quit', { label: 'SAVE AND QUIT', sub: 'CONTINUE IT FROM THE NEST' }]
      ];
      const pick = items[await choose(this, { title: 'PAUSED', options: items.map(([, o]) => o), bh: 26 })][0];
      if (pick === 'resume') return this.close();
      if (pick === 'quit') { if (await this.confirmQuit()) return this.quit(); continue; }
      if (pick === 'sound') await soundMenu(this);
      else if (pick === 'stats') await showRunStats(this, session.run);
      else if (pick === 'shake') s.shake = !s.shake;
      else if (pick === 'aim') s.aim = s.aim === 'auto' ? 'manual' : 'auto';
      persist();
      applySettings(this.registry);
      if (pick === 'shake' || pick === 'aim') sfx('blip');
    }
  }

  // Mid-fight, the fight starts over when the run continues (the save is the fight's start).
  async confirmQuit() {
    if (this.from !== 'Battle' || !session.run) return true;
    const i = await choose(this, {
      title: 'QUIT THIS FIGHT?',
      lines: ['THE RUN IS SAVED. THIS FIGHT', 'STARTS OVER WHEN YOU CONTINUE.'],
      options: [{ label: 'CANCEL' }, { label: 'SAVE AND QUIT' }]
    });
    return i === 1;
  }

  close() {
    music.setDim(false);
    this.scene.resume(this.from);
    this.scene.stop();
  }

  quit() {
    quickSave();
    music.setDim(false);
    this.scene.stop(this.from);
    this.scene.start('Home');
  }
}
