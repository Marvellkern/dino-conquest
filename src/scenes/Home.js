import { syncLayout } from '../systems/screen.js';
import { amberCount } from '../ui/amber.js';
import { W, H, COLORS, lp } from '../config.js';
import { SPECIES } from '../data/species.js';
import { ZONES } from '../data/zones.js';
import { session, dinoName, dinoSkin } from '../run/run.js';
import { peekRun, resumeRun, takeResume } from '../systems/runStore.js';
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
import { FocusNav } from '../ui/focus.js';
import { menuLight } from '../render/menuLight.js';
import { gfxLabel } from '../render/quality.js';
import { GFX_SETTINGS } from '../data/quality.js';
import { sfx } from '../systems/sfx.js';
import { music } from '../systems/music.js';
import { variantDex } from '../ui/variantDex.js';
import { freeReady } from '../systems/gacha.js';

const DEX_ORDER = ['compy', 'raptor', 'trike', 'rex', 'pachy', 'sarco', 'spino', 'ankylo', 'ptera', 'stego', 'carno', 'dilo', 'theri'];
const DEX_PAGE = 4;

// Boxes [x, y, w, h] per layout: landscape side by side, portrait stacked.
// With a run saved, CONTINUE RUN takes the hatch box; NEW EGG and SETTINGS share the settings box.
// daily: the Daily Hatchery (scenes/Daily.js).
const BOX = () => lp(
  { dex: [4, 20, 152, 118], nest: [162, 20, 154, 118], hatch: [4, 142, 148, 34], daily: [156, 142, 72, 34], settings: [232, 142, 84, 34], egg: [232, 142, 84, 16], set2: [232, 160, 84, 16] },
  { dex: [4, 20, 172, 118], nest: [4, 142, 172, 108], hatch: [4, 254, 112, 34], daily: [120, 254, 56, 34], settings: [4, 292, 172, 24], egg: [4, 292, 84, 24], set2: [92, 292, 84, 24] }
);

// Where a resumed run picks up, by its saved phase.
const RESUME = {
  map: () => ['Map'], node: () => ['Map'], rewards: () => ['Map'], evolve: () => ['Evolution'],
  battle: (p) => ['Battle', { node: p.node, seed: p.seed }],
  end: (p) => (p.won ? ['RunEnd', { won: true }] : ['Fossil'])
};

// Home / Nest hub: Amber, Dino-dex, the Nest menus (unlocks, goals, family
// tree, Extinction level), and the way into a new run.
export class Home extends Phaser.Scene {
  constructor() { super('Home'); }

  create() {
    syncLayout(this);
    music.play('nest', { layer: 'full' });
    this.inMenu = false; // scene instances are reused across restarts
    this.cameras.main.fadeIn(150);
    const g = this.add.graphics();
    g.fillStyle(0x16181d).fillRect(0, 0, W, H);
    menuLight(this, { bloom: false, key: { x: W / 2, y: -20, radius: lp(220, 200), color: 0xfff0c8, alpha: 0.16 } }); // no bloom: the text is in the world layer here
    text(this, 6, 6, 'DINO-CONQUEST', { color: COLORS.accent });
    amberCount(this, W - 6, 6, meta.amber);

    this.drawDex();
    this.drawNest();

    const saved = peekRun();
    this.saved = saved.run ? saved : null;
    let main;
    if (this.saved) {
      main = this.drawContinue();
      this.hatchBtn = new Button(this, ...BOX().egg, { key: 'N', label: 'NEW EGG', onClick: () => this.abandon() });
      this.settingsBtn = new Button(this, ...BOX().set2, { key: 'S', label: 'SETTINGS', onClick: () => this.settings() });
    } else {
      main = this.hatchBtn = new Button(this, ...BOX().hatch, { label: 'HATCH AN EGG', onClick: () => this.go() });
      this.refreshHatch();
      this.settingsBtn = new Button(this, ...BOX().settings, { key: 'S', label: 'SETTINGS', sub: 'SOUND, SHAKE', onClick: () => this.settings() });
    }
    const free = freeReady(meta.gacha);
    this.dailyBtn = new Button(this, ...BOX().daily, { key: 'Y', label: 'DAILY', sub: free ? 'FREE PULL!' : 'HATCHERY', subColor: free ? '#ffd040' : '#c0cbdc', onClick: () => this.openDaily() });
    const navItems = [...Object.values(this.nestKeys), main, this.dailyBtn, this.saved ? this.hatchBtn : null, this.settingsBtn].filter(Boolean);
    this.nav = new FocusNav(this, { items: () => navItems, start: navItems.indexOf(main) });
    this.onKey = (e) => {
      if (e.repeat || this.inMenu) return;
      if (this.nav.handle(e)) return;
      if (e.code === 'Space' || e.code === 'Enter') main.click();
      else if (e.code === 'KeyN' && this.saved) this.hatchBtn.click();
      else if (e.code === 'KeyS') this.settingsBtn.click();
      else if (e.code === 'KeyD') this.flipDex();
      else if (e.code === 'KeyV') this.openVariants();
      else if (e.code === 'KeyY') this.dailyBtn.click();
      else if (this.nestKeys[e.code]) this.nestKeys[e.code].click();
    };
    this.input.keyboard.on('keydown', this.onKey);
    this.events.once('shutdown', () => this.input.keyboard?.off('keydown', this.onKey));
    if (meta.notice) this.notice();
    else if (saved.error) this.runLost();
  }

  // The saved run's button: its dino, level, zone and lives.
  drawContinue() {
    const [x, y, w, h] = BOX().hatch, { run } = this.saved, d = run.dino;
    const skin = dinoSkin(d), icon = this.textures.exists(skin) ? this.textures.get(skin).getSourceImage() : null;
    const iconW = icon ? (icon.height > h - 6 ? icon.width / 2 : icon.width) + 4 : 0;
    // The longest line that fits beside the icon (small font: 4px a letter): name, level,
    // zone and lives; then without the name; then without "LIVES".
    const lives = `${run.lives} ${run.lives === 1 ? 'LIFE' : 'LIVES'}`, zone = ZONES[run.zone].name;
    const sub = [`${dinoName(d).toUpperCase()}  LV${d.level}  ${zone}  ${lives}`, `LV${d.level}  ${zone}  ${lives}`, `LV${d.level}  ${zone}`]
      .find((s) => s.length * 4 <= w - 10 - iconW) ?? `LV${d.level}`;
    const btn = new Button(this, x, y, w, h, { label: 'CONTINUE RUN', sub, onClick: () => this.continueRun() });
    if (this.textures.exists(skin)) {
      const img = this.add.image(x + 4, y + h - 3, skin).setOrigin(0, 1).setDepth(12);
      if (img.height > h - 6) img.setScale(0.5); // big dinos at half size so they fit the button
      const shift = Math.ceil((img.displayWidth + 4) / 2); // center the text in the room right of the icon
      btn.label.x += shift;
      btn.sub.x += shift;
    }
    return btn;
  }

  async runLost() {
    this.inMenu = true;
    await choose(this, { title: 'RUN LOST', lines: ['YOUR LAST RUN COULD NOT', 'BE RESTORED.'], options: [{ label: 'OK' }] });
    this.inMenu = false;
  }

  continueRun() {
    if (this.inMenu) return;
    const phase = resumeRun();
    if (!phase) { this.scene.restart(); return; }
    const [to, data] = (RESUME[phase.kind] ?? RESUME.map)(phase);
    this.inMenu = true;
    this.cameras.main.fadeOut(150);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(to, data));
  }

  // A new egg ends the saved run first, as a death: Fossil screen, Amber banked, Bloodline pick.
  async abandon() {
    if (this.inMenu) return;
    if (this.saved.phase.kind === 'end') return this.continueRun(); // already over: finish its end screen
    this.inMenu = true;
    const yes = await choose(this, {
      title: 'ABANDON CURRENT RUN?',
      lines: ['IT COUNTS AS A DEATH.'],
      options: [{ label: 'CANCEL' }, { label: 'ABANDON IT', sub: 'YOUR DINO FOSSILIZES' }]
    });
    if (yes !== 1 || !resumeRun()) { this.inMenu = false; return; }
    takeResume();
    const run = session.run;
    run.cause = 'ABANDONED';
    run.lives = 0;
    this.cameras.main.fadeOut(150);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Fossil'));
  }

  // One-time message (the v2 save upgrade).
  async notice() {
    this.inMenu = true;
    const n = meta.notice; // a string (the v2 upgrade) or { title, lines }
    await choose(this, typeof n === 'object' ? { title: n.title, lines: n.lines, options: [{ label: 'OK' }] }
      : { title: 'THE NEST HAS CHANGED', lines: [n, 'SPEND AMBER ON UNLOCKS,', 'CHASE GOALS, GROW A BLOODLINE.'], options: [{ label: 'OK' }] });
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
        // Tap a card: its color variants (ui/variantDex.js); a badge counts the ones owned.
        this.dexCells.push(this.add.zone(cx - 33, top, 66, 48).setOrigin(0).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.openVariants(id)));
        const nv = Object.keys(meta.gacha.variants[id] ?? {}).length;
        if (nv) this.dexCells.push(text(this, cx - 30, top + 3, `${nv}/6`, { color: '#ffd040', small: true }));
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
        text(this, cx, top + 32, entry ? SPECIES[id].short ?? SPECIES[id].name : '???', { origin: [0.5, 0], color: entry ? rar.color : COLORS.textDim, shadow: false }),
        text(this, cx, top + 41, best ?? (entry ? 'NO RUNS YET' : locked ? 'NEST EGG' : rar.name), { origin: [0.5, 0], color: locked ? rar.color : COLORS.textDim, small: true })
      );
    });
  }

  // Variant pages, from a species (default: the first one shown on the current page).
  async openVariants(id = DEX_ORDER[this.dexPage * DEX_PAGE]) {
    if (this.inMenu) return;
    this.inMenu = true;
    sfx('blip');
    await variantDex(this, DEX_ORDER, id, (sp) => meta.gacha.variants[sp] ?? {});
    this.inMenu = false;
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
    if (this.saved) return; // NEW EGG has no room for the lives line
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
    let gfxChanged = false; // a new tier applies when Home is rebuilt after the menu
    music.setDim(true);
    for (;;) {
      // Each entry: [id, option]. Fullscreen only where the browser supports it.
      const items = [
        ['sound', { label: 'SOUND', sub: s.sfx ? `MUSIC ${s.music}  SFX ${s.sfxVol}` : 'OFF' }],
        ['shake', { label: `SCREEN SHAKE: ${s.shake ? 'ON' : 'OFF'}` }],
        ['aim', { label: `COUNTER AIM: ${s.aim === 'auto' ? 'AUTO' : 'MANUAL'}` }],
        ['gfx', { label: `GRAPHICS: ${gfxLabel(this.game)}` }],
        ...(canFullscreen() ? [['full', { label: `FULLSCREEN: ${isFullscreen() ? 'ON' : 'OFF'}` }]] : []),
        ['reset', { label: 'RESET SAVE', sub: 'ERASES ALL PROGRESS' }],
        ['back', { label: 'BACK' }]
      ];
      const pick = items[await choose(this, { title: 'SETTINGS', options: items.map(([, o]) => o), bh: 26 })][0];
      if (pick === 'sound') await this.soundMenu();
      else if (pick === 'shake') s.shake = !s.shake;
      else if (pick === 'aim') s.aim = s.aim === 'auto' ? 'manual' : 'auto';
      else if (pick === 'gfx') { s.gfx = GFX_SETTINGS[(GFX_SETTINGS.indexOf(s.gfx ?? 'auto') + 1) % GFX_SETTINGS.length]; gfxChanged = true; }
      else if (pick === 'full') { if (isFullscreen()) exitFullscreen(); else enterFullscreen(); await new Promise((r) => setTimeout(r, 250)); }
      else if (pick === 'reset') {
        const yes = await choose(this, {
          title: 'ERASE EVERYTHING?',
          lines: ['AMBER, UNLOCKS, GOALS, FAMILY', 'AND DINO-DEX WILL BE LOST.'],
          options: [{ label: 'CANCEL' }, { label: 'YES, ERASE IT ALL' }]
        });
        if (yes === 1) {
          music.setDim(false);
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
    music.setDim(false);
    if (gfxChanged) this.scene.restart(); // rebuild at the new render scale
  }

  // Sound sub-menu: Music and SFX volume (0-100, each tap +10, wrapping) and the mute toggle.
  async soundMenu() {
    const s = meta.settings, VOLS = ['music', 'sfxVol'];
    for (;;) {
      const items = [
        ['music', { label: `MUSIC: ${s.music}`, sub: 'TAP TO CHANGE' }],
        ['sfxVol', { label: `SFX: ${s.sfxVol}`, sub: 'TAP TO CHANGE' }],
        ['sfx', { label: `SOUND: ${s.sfx ? 'ON' : 'OFF'}` }],
        ['back', { label: 'BACK' }]
      ];
      const pick = items[await choose(this, { title: 'SOUND', options: items.map(([, o]) => o), bh: 26 })][0];
      if (pick === 'back') return;
      if (VOLS.includes(pick)) s[pick] = (s[pick] + 10) % 110;
      else s.sfx = !s.sfx;
      persist();
      applySettings(this.registry);
      sfx('blip');
    }
  }

  openDaily() {
    if (this.inMenu) return;
    this.inMenu = true;
    this.cameras.main.fadeOut(150);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Daily'));
  }

  go() {
    if (this.inMenu) return;
    this.cameras.main.fadeOut(150);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Hatch'));
  }
}
