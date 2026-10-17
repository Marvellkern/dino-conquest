import { W, COLORS } from '../config.js';
import { SPECIES } from '../data/species.js';
import { RARITIES } from '../data/hatch.js';
import { LINEAGE, BASE_LIVES, stacks, bonusOf } from '../data/lineage.js';
import { text } from '../ui/font.js';
import { panel } from '../ui/pixel.js';
import { Button } from '../ui/button.js';
import { meta, persist, applySettings, resetMeta } from '../systems/meta.js';
import { choose } from '../ui/popup.js';
import { sfx } from '../systems/sfx.js';

const DEX_ORDER = ['compy', 'raptor', 'trike', 'rex', 'pachy', 'sarco', 'spino'];
const DEX_PAGE = 4;

// Home / Nest hub: Amber, Dino-dex, Lineage bonuses, and the way into a new run.
export class Home extends Phaser.Scene {
  constructor() { super('Home'); }

  create() {
    this.inMenu = false; // scene instances are reused across restarts
    this.cameras.main.fadeIn(250);
    const g = this.add.graphics();
    g.fillStyle(0x16181d).fillRect(0, 0, W, 180);
    text(this, 6, 6, 'DINO-CONQUEST', { color: COLORS.accent });
    text(this, W - 6, 6, `AMBER ${meta.amber}`, { color: '#e8a030', origin: [1, 0] });

    this.drawDex();
    this.drawLineage();

    const lives = BASE_LIVES + bonusOf(meta, 'life');
    const hatch = new Button(this, 4, 142, 224, 34, {
      label: 'HATCH AN EGG', sub: `${lives} LIVES PER RUN`, onClick: () => this.go()
    });
    this.settingsBtn = new Button(this, 232, 142, 84, 34, { key: 'S', label: 'SETTINGS', sub: 'SOUND, SHAKE', onClick: () => this.settings() });
    this.onKey = (e) => {
      if (e.repeat || this.inMenu) return;
      if (e.code === 'Space' || e.code === 'Enter') hatch.click();
      else if (e.code === 'KeyS') this.settingsBtn.click();
      else if (e.code === 'KeyD') this.flipDex();
    };
    this.input.keyboard.on('keydown', this.onKey);
    this.events.once('shutdown', () => this.input.keyboard?.off('keydown', this.onKey));
  }

  // Four species per page; tap the panel or press D to flip pages.
  drawDex() {
    panel(this.add.graphics(), 4, 20, 152, 118);
    const seen = DEX_ORDER.filter((id) => meta.dex[id]);
    text(this, 10, 25, `DINO-DEX ${seen.length}/${DEX_ORDER.length}`, { shadow: false });
    this.dexPages = Math.ceil(DEX_ORDER.length / DEX_PAGE);
    this.dexPage = 0;
    this.dexPageText = text(this, 150, 25, '', { color: COLORS.textDim, origin: [1, 0], shadow: false });
    this.add.zone(4, 20, 152, 118).setOrigin(0).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.flipDex());
    this.drawDexPage();
  }

  flipDex() {
    if (this.inMenu || this.dexPages < 2) return;
    this.dexPage = (this.dexPage + 1) % this.dexPages;
    sfx('tick');
    this.drawDexPage();
  }

  drawDexPage() {
    for (const o of this.dexCells ?? []) o.destroy();
    this.dexCells = [];
    if (this.dexPages > 1) this.dexPageText.setText(`D ${this.dexPage + 1}/${this.dexPages}`);
    DEX_ORDER.slice(this.dexPage * DEX_PAGE, (this.dexPage + 1) * DEX_PAGE).forEach((id, i) => {
      const cx = 8 + (i % 2) * 74 + 36, top = 35 + Math.floor(i / 2) * 51;
      const entry = meta.dex[id], rar = RARITIES[SPECIES[id].rarity];
      const img = this.add.image(cx, top + 16, id);
      if (!entry) img.setTintFill(0x0c0e12);
      if (entry?.wins) { // crown: this species has cleared a run
        this.dexCells.push(this.add.image(cx + 28, top + 2, 'crown').setOrigin(1, 0));
        if (entry.wins > 1) this.dexCells.push(text(this, cx + 29, top + 9, `X${entry.wins}`, { color: '#fff096', origin: [1, 0], shadow: false }));
      }
      this.dexCells.push(
        img,
        text(this, cx, top + 32, entry ? SPECIES[id].name : '???', { origin: [0.5, 0], color: entry ? rar.color : COLORS.textDim, shadow: false }),
        text(this, cx, top + 41, entry?.best ? `BEST LV${entry.best}` : entry ? 'NO RUNS YET' : rar.name, {
          origin: [0.5, 0], color: COLORS.textDim, shadow: false
        })
      );
    });
  }

  drawLineage() {
    panel(this.add.graphics(), 162, 20, 154, 118);
    text(this, 168, 25, 'LINEAGE', { shadow: false });
    const owned = Object.keys(LINEAGE).filter((id) => stacks(meta, id) > 0);
    if (!owned.length) {
      ['NO BONUSES YET.', '', 'A FALLEN DINO LEAVES', 'A FOSSIL: 1 BONUS.', '', 'CLEARING A RUN', 'GIVES 2 BONUSES.']
        .forEach((l, i) => text(this, 168, 38 + i * 10, l, { color: COLORS.textDim, shadow: false }));
    }
    owned.forEach((id, i) => {
      const y = 38 + i * 11;
      text(this, 168, y, LINEAGE[id].name, { shadow: false });
      text(this, 310, y, LINEAGE[id].total(stacks(meta, id)), { color: '#7fe0ff', origin: [1, 0], shadow: false });
    });
    const { runs, wins } = meta.stats;
    text(this, 168, 126, `FOSSILS ${meta.fossils.length} RUNS ${runs} WINS ${wins}`, { color: COLORS.textDim, shadow: false });
  }

  // Settings popup loops until BACK. Toggles save immediately.
  async settings() {
    if (this.inMenu) return;
    this.inMenu = true;
    const s = meta.settings;
    for (;;) {
      const i = await choose(this, {
        title: 'SETTINGS',
        options: [
          { label: `SOUND: ${s.sfx ? 'ON' : 'OFF'}` },
          { label: `SCREEN SHAKE: ${s.shake ? 'ON' : 'OFF'}` },
          { label: 'RESET SAVE', sub: 'ERASES ALL PROGRESS' },
          { label: 'BACK' }
        ]
      });
      if (i === 0) s.sfx = !s.sfx;
      else if (i === 1) s.shake = !s.shake;
      else if (i === 2) {
        const yes = await choose(this, {
          title: 'ERASE EVERYTHING?',
          lines: ['AMBER, FOSSILS, LINEAGE', 'AND DINO-DEX WILL BE LOST.'],
          options: [{ label: 'CANCEL' }, { label: 'YES, ERASE IT ALL' }]
        });
        if (yes === 1) {
          resetMeta();
          applySettings(this.registry);
          this.scene.restart();
          return;
        }
      } else break;
      persist();
      applySettings(this.registry);
      if (i === 1 && s.shake) this.cameras.main.shake(120, 0.008);
      sfx('blip');
    }
    this.inMenu = false;
  }

  go() {
    if (this.inMenu) return;
    this.cameras.main.fadeOut(200);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Hatch'));
  }
}
