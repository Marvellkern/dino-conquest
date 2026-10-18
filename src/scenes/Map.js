import { syncLayout } from '../systems/screen.js';
import { W, H, COLORS, PORTRAIT, lp } from '../config.js';
import { NODE_INFO } from '../data/zones.js';
import { RelicBar } from '../ui/relicBar.js';
import { visitNest, visitFossil, visitMeteor, visitShop, nestHeal } from './mapNodes.js';
import { TRAITS } from '../data/traits.js';
import { xpToNext } from '../data/progression.js';
import { text } from '../ui/font.js';
import { drawMapBackground } from '../ui/backdrop.js';
import { panel, pixelLine, pixelCircle } from '../ui/pixel.js';
import { choose } from '../ui/popup.js';
import {
  session, reachable, zoneOf, dinoStats, dinoName, dinoSkin, groupName,
} from '../run/run.js';
import { Fx } from '../systems/fx.js';
import { sfx } from '../systems/sfx.js';

// Landscape: columns left to right, lanes stacked. Portrait: rows climb from
// the bottom (start) to the boss at the top, lanes side by side.
const LANE_Y = [72, 104, 136];
const colX = (row) => 34 + row * 38;
const LANE_X = [46, 90, 134];
const rowY = (row) => 252 - row * 24;
const ICON = { fight: 'icon_fight', elite: 'icon_elite', nest: 'icon_nest', fossil: 'icon_fossil', meteor: 'icon_meteor', shop: 'icon_shop' };

// Zone map: pick the next node, travel, resolve it.
export class MapScene extends Phaser.Scene {
  constructor() { super('Map'); }

  create() {
    syncLayout(this);
    this.run = session.run;
    if (!this.run) { this.scene.start('Hatch'); return; }
    this.d = this.run.dino;
    this.fx = new Fx(this);
    this.busy = false;
    this.cameras.main.fadeIn(150);

    drawMapBackground(this, this.run.zone);
    this.edges = this.add.graphics().setDepth(2);
    this.rings = this.add.graphics().setDepth(4);
    this.time.addEvent({ delay: 380, loop: true, callback: () => this.rings.setVisible(!this.rings.visible) });
    this.icons = {};
    for (const n of Object.values(this.run.map.nodes)) this.addNode(n);
    this.marker = this.add.image(0, 0, dinoSkin(this.d)).setOrigin(0.5, 1).setDepth(6);
    const here = this.pos(this.run.at);
    this.marker.setPosition(Math.max(here.x, Math.ceil(this.marker.width / 2) + 1), here.y - 6); // wide dinos stay on screen at the start

    this.buildHud();
    if (PORTRAIT) { // two small lines, so fossil descriptions fit
      panel(this.add.graphics().setDepth(10), 4, H - 22, W - 8, 18);
      this.tip = text(this, W / 2, H - 19, '', { origin: [0.5, 0], small: true }).setDepth(11).setMaxWidth(W - 16).setCenterAlign();
    } else {
      panel(this.add.graphics().setDepth(10), 4, 160, W - 8, 16);
      this.tip = text(this, W / 2, 164, '', { origin: [0.5, 0] }).setDepth(11);
    }

    this.onKey = (e) => this.key(e);
    this.input.keyboard.on('keydown', this.onKey);
    this.events.once('shutdown', () => this.input.keyboard?.off('keydown', this.onKey));
    this.sel = 0;
    this.refresh();
  }

  update(_, dt) { this.fx.update(dt); }

  pos(id) {
    if (PORTRAIT) {
      if (!id) return { x: LANE_X[1], y: rowY(0) + 38 };
      const n = this.run.map.nodes[id];
      return { x: id === 'boss' ? LANE_X[1] : LANE_X[n.lane], y: id === 'boss' ? rowY(n.row) - 4 : rowY(n.row) };
    }
    if (!id) return { x: 10, y: LANE_Y[1] };
    const n = this.run.map.nodes[id];
    if (id === 'boss') { // wide boss sprites stay on screen
      const w = this.textures.get(n.enemies[0].skin ?? n.enemies[0].species).getSourceImage().width;
      return { x: Math.min(colX(n.row), W - 3 - Math.ceil(w / 2)), y: LANE_Y[n.lane] };
    }
    return { x: colX(n.row), y: LANE_Y[n.lane] };
  }

  options() {
    const ids = reachable(this.run);
    return ids.sort((a, b) => this.run.map.nodes[a].lane - this.run.map.nodes[b].lane);
  }

  /* ---------- drawing ---------- */

  addNode(n) {
    const { x, y } = this.pos(n.id);
    const img = this.add.image(x, y, n.type === 'boss' ? n.enemies[0].skin ?? n.enemies[0].species : ICON[n.type]).setDepth(5);
    if (n.type === 'boss') img.setFlipX(true);
    this.icons[n.id] = img;
    const zone = this.add.zone(x, y, lp(36, 40), lp(32, 25)).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => { const i = this.options().indexOf(n.id); if (i >= 0) { this.sel = i; this.refresh(); } });
    zone.on('pointerdown', () => { if (this.options().includes(n.id)) this.go(n.id); });
  }

  refresh() {
    const { nodes } = this.run.map, opts = this.options();
    this.sel = Math.min(this.sel, opts.length - 1);
    this.edges.clear();
    this.rings.clear();
    for (const n of Object.values(nodes)) {
      const a = this.pos(n.id);
      for (const m of n.next) {
        const b = this.pos(m), traveled = n.done && nodes[m].done, open = n.id === this.run.at && opts.includes(m);
        const color = traveled ? 0xc8a058 : open ? 0xfff096 : 0x35503c;
        const ex = m === 'boss' ? 18 : 9;
        if (PORTRAIT) pixelLine(this.edges, a.x, a.y - 7, b.x, b.y + (m === 'boss' ? 14 : 7), color, 1, traveled ? 1 : 2);
        else pixelLine(this.edges, a.x + 9, a.y, b.x - ex, b.y, color, 1, traveled ? 1 : 2);
      }
      this.icons[n.id].setTint(n.done ? 0x707070 : 0xffffff).setAlpha(n.done || opts.includes(n.id) ? 1 : 0.7);
    }
    if (!this.run.at) {
      if (PORTRAIT) pixelLine(this.edges, LANE_X[1], rowY(0) + 26, LANE_X[1], rowY(0) + 7, 0xfff096, 1, 2);
      else pixelLine(this.edges, 18, LANE_Y[1], colX(0) - 9, LANE_Y[1], 0xfff096, 1, 2);
    }
    opts.forEach((id, i) => {
      const p = this.pos(id), r = id === 'boss' ? 20 : 11;
      pixelCircle(this.rings, p.x, p.y, r, 0xfff096);
      if (i === this.sel) pixelCircle(this.rings, p.x, p.y, r + 2, 0xffffff);
    });
    this.tip.setText(this.describe(nodes[opts[this.sel]]));
    this.updateHud();
  }

  describe(n) {
    if (!n) return '';
    if (n.type === 'nest') return `NEST: HEAL ${Math.round(nestHeal(this.run) * 100)}% HP`;
    if (!n.enemies) return NODE_INFO[n.type];
    return `${NODE_INFO[n.type]}: ${groupName(n)}${n.type === 'boss' ? '' : ` LV${n.enemies[0].level}`}`;
  }

  // Portrait HUD: name + hearts, HP / XP bars with traits, zone + Amber, then the fossils in one row.
  buildHud() {
    if (PORTRAIT) return this.buildHudPortrait();
    panel(this.add.graphics().setDepth(10), 4, 4, W - 8, 34);
    this.hName = text(this, 8, 8, '').setDepth(11);
    this.hBars = this.add.graphics().setDepth(11);
    this.hearts = Array.from({ length: this.run.maxLives }, (_, i) =>
      this.add.image(112 + i * 9, 7, 'heart').setOrigin(0).setDepth(11));
    this.hHp = text(this, 112, 18, '', { color: COLORS.textDim, small: true }).setDepth(11);
    this.hXp = text(this, 112, 26, '', { color: COLORS.textDim, small: true }).setDepth(11);
    text(this, W - 8, 8, zoneOf(this.run).name + (this.run.ext ? ` EXT${this.run.ext}` : ''), { color: COLORS.accent, origin: [1, 0] }).setDepth(11);
    this.hAmber = text(this, W - 8, 17, '', { color: '#e8a030', origin: [1, 0], shadow: false }).setDepth(11);
    this.hTraits = text(this, W - 8, 27, '', { color: COLORS.textDim, origin: [1, 0], small: true }).setDepth(11);
    // Owned fossils + perks (2 rows of 7); tap one to read it in the tooltip bar.
    this.relicBar = new RelicBar(this, 178, 7, { cols: 7, onInfo: (t) => this.tip.setText(t) });
  }

  buildHudPortrait() {
    panel(this.add.graphics().setDepth(10), 4, 4, W - 8, 56);
    this.hName = text(this, 8, 8, '').setDepth(11);
    this.hBars = this.add.graphics().setDepth(11);
    const lives = this.run.maxLives;
    this.hearts = Array.from({ length: lives }, (_, i) =>
      this.add.image(W - 8 - (lives - i) * 9 + 2, 8, 'heart').setOrigin(0).setDepth(11));
    this.hHp = text(this, 96, 18, '', { color: COLORS.textDim, small: true }).setDepth(11);
    this.hXp = text(this, 96, 26, '', { color: COLORS.textDim, small: true }).setDepth(11);
    this.hTraits = text(this, W - 8, 26, '', { color: COLORS.textDim, origin: [1, 0], small: true }).setDepth(11);
    text(this, 8, 34, zoneOf(this.run).name + (this.run.ext ? ` EXT${this.run.ext}` : ''), { color: COLORS.accent, small: true }).setDepth(11);
    this.hAmber = text(this, W - 8, 34, '', { color: '#e8a030', origin: [1, 0], small: true }).setDepth(11);
    this.relicBar = new RelicBar(this, 8, 44, { cols: 18, onInfo: (t) => this.tip.setText(t) });
  }

  updateHud() {
    const d = this.d, max = dinoStats(d).hp, need = xpToNext(d.level), bw = lp(100, 84);
    this.hName.setText(`${dinoName(d)}  LV${d.level}`);
    this.hearts.forEach((h, i) => h.setTexture(i < this.run.lives ? 'heart' : 'heart_empty'));
    const g = this.hBars.clear();
    g.fillStyle(0x0c0e12).fillRect(7, 17, bw + 2, 7).fillRect(7, 26, bw + 2, 5);
    g.fillStyle(0x1a1d23).fillRect(8, 18, bw, 5).fillRect(8, 27, bw, 3);
    const k = d.hp / max;
    g.fillStyle(k > 0.5 ? 0x5ca048 : k > 0.25 ? 0xe0b040 : 0xc8281e).fillRect(8, 18, Math.round(bw * k), 5);
    g.fillStyle(0x5aa0e0).fillRect(8, 27, Math.round((bw * d.xp) / need), 3);
    this.hHp.setText(`HP ${d.hp}/${max}`);
    this.hXp.setText(`XP ${d.xp}/${need}`);
    this.hAmber.setText(`+${this.run.amber} AMBER`);
    this.hTraits.setText(d.traits.map((t) => TRAITS[t].short).join(' '));
    const owned = [...this.run.relics, ...this.run.perks].slice(0, 14);
    if (owned.join() !== this.ownedKey) { this.ownedKey = owned.join(); this.relicBar.set(owned); }
  }

  /* ---------- input + travel ---------- */

  key(e) {
    if (this.busy || e.repeat) return;
    const opts = this.options();
    if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'ArrowLeft') this.sel = (this.sel + opts.length - 1) % opts.length;
    else if (e.code === 'ArrowDown' || e.code === 'KeyS' || e.code === 'ArrowRight') this.sel = (this.sel + 1) % opts.length;
    else if (e.code === 'Enter' || e.code === 'Space') return this.go(opts[this.sel]);
    else if ('123'.includes(e.key) && opts[+e.key - 1]) return this.go(opts[+e.key - 1]);
    else return;
    sfx('tick');
    this.refresh();
  }

  async go(id) {
    if (this.busy) return;
    this.busy = true;
    sfx('blip');
    const from = { x: this.marker.x, y: this.marker.y }, to = this.pos(id);
    for (const k of [0.5, 1]) {
      await new Promise((r) => this.tweens.add({
        targets: this.marker, x: from.x + (to.x - from.x) * k, y: from.y + (to.y - 6 - from.y) * k - 0,
        duration: 140, ease: 'Sine.InOut', onComplete: r
      }));
      sfx('step');
    }
    this.enter(this.run.map.nodes[id]);
  }

  async enter(node) {
    const run = this.run, d = this.d;
    run.at = node.id;
    node.done = true;
    this.refresh();

    if (node.enemies) {
      sfx('tell');
      this.fx.pop(this.marker.x, this.marker.y - 30, '!', '#fff096', 2, 400);
      this.time.delayedCall(220, () => this.cameras.main.fadeOut(150));
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Battle', { node: node.id }));
      return;
    }
    const visit = { nest: visitNest, fossil: visitFossil, meteor: visitMeteor, shop: visitShop }[node.type];
    if (visit) await visit(this, run);
    if (d.pendingEvo) { this.scene.start('Evolution'); return; }
    this.busy = false;
    this.sel = 0;
    this.refresh();
  }
}
