import { W, COLORS } from '../config.js';
import { SPECIES } from '../data/species.js';
import { RARITIES } from '../data/hatch.js';
import { GOAL_ORDER } from '../data/goals.js';
import { EXTINCTION } from '../data/extinction.js';
import { text } from '../ui/font.js';
import { panel } from '../ui/pixel.js';
import { Button } from '../ui/button.js';
import { meta, persist, applySettings, resetMeta, runSetup, extUnlocked, maxExtChoice } from '../systems/meta.js';
import { goalsDone } from '../systems/goals.js';
import { choose } from '../ui/popup.js';
import { sfx } from '../systems/sfx.js';

const DEX_ORDER = ['compy', 'raptor', 'trike', 'rex', 'pachy', 'sarco', 'spino'];
const DEX_PAGE = 4;

// Home / Nest hub: Amber, Dino-dex, the Nest menus (unlocks, goals, family
// tree, Extinction level), and the way into a new run.
export class Home extends Phaser.Scene {
  constructor() { super('Home'); }

  create() {
    this.inMenu = false; // scene instances are reused across restarts
    this.cameras.main.fadeIn(150);
    const g = this.add.graphics();
    g.fillStyle(0x16181d).fillRect(0, 0, W, 180);
    text(this, 6, 6, 'DINO-CONQUEST', { color: COLORS.accent });
    text(this, W - 6, 6, `AMBER ${meta.amber}`, { color: '#e8a030', origin: [1, 0] });

    this.drawDex();
    this.drawNest();

    const hatch = this.hatchBtn = new Button(this, 4, 142, 224, 34, { label: 'HATCH AN EGG', onClick: () => this.go() });
    this.refreshHatch();
    this.settingsBtn = new Button(this, 232, 142, 84, 34, { key: 'S', label: 'SETTINGS', sub: 'SOUND, SHAKE', onClick: () => this.settings() });
    this.onKey = (e) => {
      if (e.repeat || this.inMenu) return;
      if (e.code === 'Space' || e.code === 'Enter') hatch.click();
      else if (e.code === 'KeyS') this.settingsBtn.click();
      else if (e.code === 'KeyD') this.flipDex();
      else if (this.nestKeys[e.code]) this.nestKeys[e.code].click();
    };
    this.input.keyboard.on('keydown', this.onKey);
    this.events.once('shutdown', () => this.input.keyboard?.off('keydown', this.onKey));
    if (meta.notice) this.notice();
  }

  // One-time message (the v2 save upgrade).
  async notice() {
    this.inMenu = true;
    await choose(this, { title: 'THE NEST HAS CHANGED', lines: [meta.notice, 'SPEND AMBER ON UNLOCKS,', 'CHASE GOALS, GROW A BLOODLINE.'], options: [{ label: 'OK' }] });
    meta.notice = null;
    persist();
    this.inMenu = false;
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
      if (entry) { // rarity-colored card behind each discovered species
        const card = this.add.graphics(), rc = parseInt(rar.color.slice(1), 16);
        card.fillStyle(rc, 0.3).fillRect(cx - 34, top - 2, 68, 51);
        card.fillStyle(0x262b44).fillRect(cx - 33, top - 1, 66, 49);
        card.fillStyle(rc).fillRect(cx - 33, top - 1, 66, 1).fillRect(cx - 33, top + 48, 66, 1);
        this.dexCells.push(card);
      }
      const img = this.add.image(cx, top + 16, id);
      if (!entry) img.setTintFill(0x0c0e12);
      if (entry?.wins) { // crown: this species has cleared a run
        this.dexCells.push(this.add.image(cx + 28, top + 2, 'crown').setOrigin(1, 0));
        if (entry.wins > 1) this.dexCells.push(text(this, cx + 29, top + 9, `X${entry.wins}`, { color: '#fff096', origin: [1, 0], shadow: false }));
      }
      const best = entry?.best ? `BEST LV${entry.best}${entry.ext ? ` X${entry.ext}` : ''}` : null;
      this.dexCells.push(
        img,
        text(this, cx, top + 32, entry ? SPECIES[id].name : '???', { origin: [0.5, 0], color: entry ? rar.color : COLORS.textDim, shadow: false }),
        text(this, cx, top + 41, best ?? (entry ? 'NO RUNS YET' : rar.name), {
          origin: [0.5, 0], color: COLORS.textDim, shadow: false
        })
      );
    });
  }

  // The Nest panel: heir, then a 2x2 grid of menu buttons.
  drawNest() {
    panel(this.add.graphics(), 162, 20, 154, 118);
    text(this, 168, 25, 'THE NEST', { shadow: false });
    const heir = meta.heir;
    text(this, 168, 35, heir ? `HEIR: ${heir.name.toUpperCase()}` : 'NO HEIR YET', { color: heir ? '#e8a030' : COLORS.textDim, shadow: false });
    const open = (mode) => () => this.open(mode);
    const ext = extUnlocked();
    const btns = [
      ['KeyU', 'U', 'UNLOCKS', 'SPEND AMBER', open('unlocks')],
      ['KeyG', 'G', 'GOALS', `${goalsDone()}/${GOAL_ORDER.length}`, open('goals')],
      ['KeyF', 'F', 'FAMILY', `${meta.fossils.length} DINOS`, open('family')],
      ['KeyX', 'X', 'EXTINCT', ext ? `LEVEL ${meta.ext.sel}` : 'LOCKED', () => this.extinction()]
    ];
    this.nestKeys = {};
    btns.forEach(([code, key, label, sub, fn], i) => {
      const b = new Button(this, 166 + (i % 2) * 74, 46 + Math.floor(i / 2) * 34, 72, 32, { key, label, sub, onClick: fn });
      if (i === 3) { b.setEnabled(ext); b.onDeny = () => this.say('CLEAR THE SWAMP TO UNLOCK'); this.extBtn = b; }
      this.nestKeys[code] = b;
    });
    const { runs, wins } = meta.stats;
    this.status = text(this, 168, 126, `RUNS ${runs}  WINS ${wins}`, { color: COLORS.textDim, shadow: false });
  }

  say(s) { this.status.setText(s); }

  refreshHatch() {
    const set = runSetup();
    this.hatchBtn.setText(null, `${set.lives} LIVES${set.ext ? `  EXTINCTION ${set.ext}` : ''}`);
  }

  open(mode) {
    if (this.inMenu) return;
    this.inMenu = true;
    this.cameras.main.fadeOut(150);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Nest', { mode }));
  }

  // Pick an Extinction level: up to one above the highest cleared.
  async extinction() {
    if (this.inMenu) return;
    this.inMenu = true;
    const max = maxExtChoice();
    for (;;) {
      const lv = meta.ext.sel;
      const lines = [`LEVEL ${lv} OF ${max}`, EXTINCTION[lv].desc, lv > 1 ? '+ EVERY LEVEL BELOW' : '', `BANK +${lv * 10}% AMBER`];
      const i = await choose(this, {
        title: 'EXTINCTION', lines,
        options: [
          { label: 'HARDER', disabled: lv >= max ? 'CLEAR THIS LEVEL FIRST' : null },
          { label: 'EASIER', disabled: lv <= 0 ? 'ALREADY AT 0' : null },
          { label: 'DONE' }
        ]
      });
      if (i === 2) break;
      meta.ext.sel = Math.max(0, Math.min(max, lv + (i === 0 ? 1 : -1)));
      persist();
      sfx('blip');
    }
    this.extBtn.setText(null, `LEVEL ${meta.ext.sel}`);
    this.refreshHatch();
    this.inMenu = false;
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
          lines: ['AMBER, UNLOCKS, GOALS, FAMILY', 'AND DINO-DEX WILL BE LOST.'],
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
    this.cameras.main.fadeOut(150);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Hatch'));
  }
}
