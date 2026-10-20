import { W, H, COLORS, PORTRAIT } from '../config.js';
import { SPECIES } from '../data/species.js';
import { RARITIES } from '../data/hatch.js';
import { VARIANTS } from '../data/variants.js';
import { parseEgg } from '../systems/gacha.js';
import { skinOf } from '../run/run.js';
import { ensureSkin } from '../sprites/skinBuild.js';
import { panel } from './pixel.js';
import { text } from './font.js';
import { Button } from './button.js';
import { FocusNav } from './focus.js';

// From Collection (gacha brief §6): a grid of dinos (keys 'rex' or 'rex:magma'), each in a
// rarity-colored frame with a badge in its variant's color. Tap one (or arrows + Enter).
// Resolves with its key, or null on BACK. 12 a page.
// opts: title; badge(k) (a corner label, e.g. a price); empty (the line when there are none).
const RANK = { legendary: 0, epic: 1, rare: 2, common: 3 };
const hex = (c) => parseInt(c.slice(1), 16);

export function eggPicker(scene, list, { title = 'YOUR DINOS', badge = () => '', empty = 'NONE YET: PULL SOME IN THE DAILY HATCHERY' } = {}) {
  const keys = list.filter((k) => SPECIES[parseEgg(k).species])
    .sort((a, b) => RANK[SPECIES[parseEgg(a).species].rarity] - RANK[SPECIES[parseEgg(b).species].rarity] || a.localeCompare(b));
  return new Promise((resolve) => {
    const cols = PORTRAIT ? 3 : 6, rows = PORTRAIT ? 4 : 2, per = cols * rows, cw = 46, ch = 42;
    const PW = cols * cw + 12, PH = 20 + rows * ch + 40, x = Math.round((W - PW) / 2), y = Math.max(2, Math.round((H - PH) / 2));
    const frame = [
      scene.add.rectangle(0, 0, W, H, 0x000000, 0.6).setOrigin(0).setDepth(60).setInteractive(),
      panel(scene.add.graphics().setDepth(61), x, y, PW, PH),
      text(scene, W / 2, y + 6, title, { color: COLORS.accent, origin: [0.5, 0] }).setDepth(62)
    ];
    const info = text(scene, W / 2, y + PH - 34, '', { origin: [0.5, 0], small: true }).setDepth(62);
    let page = 0, cells = [], extras = [], done = false, nav = null;
    const pages = Math.max(1, Math.ceil(keys.length / per));
    const describe = (k) => {
      const { species, variant } = parseEgg(k), sp = SPECIES[species];
      info.setText(`${(sp.short ?? sp.name).toUpperCase()}${variant ? ` · ${VARIANTS[variant].name}` : ''}  ${badge(k)}  ${RARITIES[sp.rarity].name}`);
    };
    const draw = () => {
      for (const c of cells) c.destroy();
      for (const o of extras) o.destroy();
      cells = [];
      extras = [];
      keys.slice(page * per, (page + 1) * per).forEach((k, i) => {
        const { species, variant } = parseEgg(k), rc = hex(RARITIES[SPECIES[species].rarity].color);
        const cx = x + 6 + (i % cols) * cw, cy = y + 20 + Math.floor(i / cols) * ch;
        const b = new Button(scene, cx, cy, cw - 4, ch - 4, { label: '', sub: '', depth: 62, onClick: () => finish(k) }).pin();
        b.zone.on('pointerover', () => describe(k));
        b.k = k;
        cells.push(b);
        const g = scene.add.graphics().setDepth(63);
        g.lineStyle(1, rc, 1).strokeRect(cx + 1.5, cy + 1.5, cw - 7, ch - 7);
        const img = scene.add.image(cx + (cw - 4) / 2, cy + ch - 10, ensureSkin(scene, skinOf(species, 0, null, variant))).setOrigin(0.5, 1).setDepth(63);
        if (img.height > 26 || img.width > cw - 8) img.setScale(0.5);
        extras.push(g, img, text(scene, cx + cw - 7, cy + ch - 12, badge(k), { origin: [1, 0], small: true, shadow: false }).setDepth(64));
        if (variant) extras.push(scene.add.rectangle(cx + 4, cy + 4, 4, 4, VARIANTS[variant].glow).setOrigin(0).setDepth(64));
      });
      nav?.refresh();
      if (keys.length) describe(keys[page * per]);
      else info.setText(empty);
    };
    const by = y + PH - 22;
    const btns = [
      ...(pages > 1 ? [
        new Button(scene, x + 6, by, 30, 18, { label: '<', depth: 62, onClick: () => { page = (page - 1 + pages) % pages; draw(); } }).pin(),
        new Button(scene, x + PW - 36, by, 30, 18, { label: '>', depth: 62, onClick: () => { page = (page + 1) % pages; draw(); } }).pin()
      ] : []),
      new Button(scene, Math.round(W / 2 - 30), by, 60, 18, { key: 'ESC', label: 'BACK', depth: 62, onClick: () => finish(null) }).pin()
    ];
    nav = new FocusNav(scene, {
      items: () => [...cells, ...btns], show: true, modal: true, start: 0, onBack: () => finish(null)
    });
    const onKey = (e) => { if (nav.handle(e) && nav.current?.k) describe(nav.current.k); };
    scene.input.keyboard?.on('keydown', onKey);
    const finish = (k) => {
      if (done) return;
      done = true;
      scene.input.keyboard?.off('keydown', onKey);
      nav.destroy();
      scene.time.delayedCall(80, () => { [...frame, info, ...extras].forEach((o) => o.destroy()); [...cells, ...btns].forEach((b) => b.destroy()); resolve(k); });
    };
    for (const o of frame) o.setScrollFactor(0);
    draw();
  });
}
