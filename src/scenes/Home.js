import { syncLayout } from '../systems/screen.js';
import { amberCount } from '../ui/amber.js';
import { W, H, COLORS, lp } from '../config.js';
import { SPECIES } from '../data/species.js';
import { RARITIES } from '../data/hatch.js';
import { GOAL_ORDER } from '../data/goals.js';
import { EXTINCTION } from '../data/extinction.js';
import { text } from '../ui/font.js';
import { panel } from '../ui/pixel.js';
import { Button } from '../ui/button.js';
import { meta, persist, applySettings, resetMeta, runSetup, extUnlocked, maxExtChoice, owned } from '../systems/meta.js';
import { goalsDone } from '../systems/goals.js';
import { canFullscreen, isFullscreen, enterFullscreen, exitFullscreen } from '../systems/screen.js';
import { choose } from '../ui/popup.js';
import { sfx } from '../systems/sfx.js';

const DEX_ORDER = ['compy', 'raptor', 'trike', 'rex', 'pachy', 'sarco', 'spino', 'ankylo', 'ptera', 'stego', 'carno'];
const DEX_PAGE = 4;

// Boxes [x, y, w, h] per layout: landscape side by side, portrait stacked.
const BOX = () => lp(
  { dex: [4, 20, 152, 118], nest: [162, 20, 154, 118], hatch: [4, 142, 224, 34], settings: [232, 142, 84, 34] },
  { dex: [4, 20, 172, 118], nest: [4, 142, 172, 108], hatch: [4, 254, 172, 34], settings: [4, 292, 172, 24] }
);

// Home / Nest hub: Amber, Dino-dex, the Nest menus (unlocks, goals, family
// tree, Extinction level), and the way into a new run.
export class Home extends Phaser.Scene {
  constructor() { super('Home'); }

  create() {
    syncLayout(this);
    this.inMenu = false; // scene instances are reused across restarts
    this.cameras.main.fadeIn(150);
    const g = this.add.graphics();
    g.fillStyle(0x16181d).fillRect(0, 0, W, H);
    text(this, 6, 6, 'DINO-CONQUEST', { color: COLORS.accent });
    amberCount(this, W - 6, 6, meta.amber);

    this.drawDex();
    this.drawNest();

    const hatch = this.hatchBtn = new Button(this, ...BOX().hatch, { label: 'HATCH AN EGG', onClick: () => this.go() });
    this.refreshHatch();
    this.settingsBtn = new Button(this, ...BOX().settings, { key: 'S', label: 'SETTINGS', sub: 'SOUND, SHAKE', onClick: () => this.settings() });
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
    const [x, y, w, h] = BOX().dex;
    this.dexBox = BOX().dex;
    panel(this.add.graphics(), x, y, w, h);
    const seen = DEX_ORDER.filter((id) => meta.dex[id]);
    text(this, x + 6, y + 5, `DINO-DEX ${seen.length}/${DEX_ORDER.length}`, { shadow: false });
    this.dexPages = Math.ceil(DEX_ORDER.length / DEX_PAGE);
    this.dexPage = 0;
    this.dexPageText = text(this, x + w - 6, y + 5, '', { color: COLORS.textDim, origin: [1, 0], shadow: false });
    this.add.zone(x, y, w, h).setOrigin(0).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.flipDex());
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
    // Cards: 66x48 with a 4px gap, inside the panel (y 20-138).
    DEX_ORDER.slice(this.dexPage * DEX_PAGE, (this.dexPage + 1) * DEX_PAGE).forEach((id, i) => {
      const [bx, by, bw] = this.dexBox;
      const cx = bx + Math.floor(bw / 2) + (i % 2 ? 37 : -37), top = by + 14 + Math.floor(i / 2) * 52;
      const entry = meta.dex[id], rar = RARITIES[SPECIES[id].rarity];
      if (entry) { // rarity-colored card behind each discovered species
        const card = this.add.graphics(), rc = parseInt(rar.color.slice(1), 16);
        card.fillStyle(rc, 0.3).fillRect(cx - 33, top, 66, 48);
        card.fillStyle(0x262b44).fillRect(cx - 32, top + 1, 64, 46);
        card.fillStyle(rc).fillRect(cx - 32, top, 64, 1).fillRect(cx - 32, top + 47, 64, 1);
        this.dexCells.push(card);
      }
      const img = this.add.image(cx, top + 18, id);
      if (!entry) img.setTintFill(0x0c0e12);
      if (entry?.wins) { // crown: this species has cleared a run
        this.dexCells.push(this.add.image(cx + 30, top + 3, 'crown').setOrigin(1, 0));
        if (entry.wins > 1) this.dexCells.push(text(this, cx + 30, top + 10, `X${entry.wins}`, { color: '#fff096', origin: [1, 0], small: true }));
      }
      const locked = !entry && SPECIES[id].unlock && !owned(SPECIES[id].unlock); // an egg still to buy in the Nest
      const best = entry?.best ? `BEST LV${entry.best}${entry.ext ? `  EXT ${entry.ext}` : ''}` : null;
      this.dexCells.push(
        img,
        text(this, cx, top + 32, entry ? SPECIES[id].name : '???', { origin: [0.5, 0], color: entry ? rar.color : COLORS.textDim, shadow: false }),
        text(this, cx, top + 41, best ?? (entry ? 'NO RUNS YET' : locked ? 'NEST EGG' : rar.name), { origin: [0.5, 0], color: locked ? rar.color : COLORS.textDim, small: true })
      );
    });
  }

  // The Nest panel: heir, then a 2x2 grid of menu buttons.
  drawNest() {
    const [x, y, w, h] = BOX().nest;
    panel(this.add.graphics(), x, y, w, h);
    text(this, x + 6, y + 5, 'THE NEST', { shadow: false });
    const heir = meta.heir;
    text(this, x + 6, y + 15, heir ? `HEIR: ${heir.name.toUpperCase()}` : 'NO HEIR YET', { color: heir ? '#e8a030' : COLORS.textDim, shadow: false });
    const open = (mode) => () => this.open(mode);
    const ext = extUnlocked();
    const btns = [
      ['KeyU', 'U', 'UNLOCKS', 'AMBER SHOP', open('unlocks')],
      ['KeyG', 'G', 'GOALS', `${goalsDone()}/${GOAL_ORDER.length}`, open('goals')],
      ['KeyF', 'F', 'FAMILY', `${meta.fossils.length} DINO${meta.fossils.length === 1 ? '' : 'S'}`, open('family')],
      ['KeyX', 'X', 'EXTINCT', ext ? `LEVEL ${meta.ext.sel}` : 'LOCKED', () => this.extinction()]
    ];
    this.nestKeys = {};
    btns.forEach(([code, key, label, sub, fn], i) => {
      const bw = Math.floor((w - 10) / 2);
      const b = new Button(this, x + 4 + (i % 2) * (bw + 2), y + 26 + Math.floor(i / 2) * 34, bw, 32, { key, label, sub, onClick: fn });
      if (i === 3) { b.setEnabled(ext); b.onDeny = () => this.say('CLEAR THE SWAMP TO UNLOCK'); this.extBtn = b; }
      this.nestKeys[code] = b;
    });
    const { runs, wins } = meta.stats;
    this.status = text(this, x + 6, y + h - 12, `RUNS ${runs}  WINS ${wins}`, { color: COLORS.textDim, shadow: false });
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
      // Each entry: [id, option]. Fullscreen only where the browser supports it.
      const items = [
        ['sfx', { label: `SOUND: ${s.sfx ? 'ON' : 'OFF'}` }],
        ['shake', { label: `SCREEN SHAKE: ${s.shake ? 'ON' : 'OFF'}` }],
        ...(canFullscreen() ? [['full', { label: `FULLSCREEN: ${isFullscreen() ? 'ON' : 'OFF'}` }]] : []),
        ['reset', { label: 'RESET SAVE', sub: 'ERASES ALL PROGRESS' }],
        ['back', { label: 'BACK' }]
      ];
      const pick = items[await choose(this, { title: 'SETTINGS', options: items.map(([, o]) => o), bh: 26 })][0];
      if (pick === 'sfx') s.sfx = !s.sfx;
      else if (pick === 'shake') s.shake = !s.shake;
      else if (pick === 'full') { if (isFullscreen()) exitFullscreen(); else enterFullscreen(); await new Promise((r) => setTimeout(r, 250)); }
      else if (pick === 'reset') {
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
      if (pick === 'shake' && s.shake) this.cameras.main.shake(120, 0.008);
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
