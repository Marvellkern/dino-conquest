import { W, COLORS } from '../config.js';
import { NODE_INFO, NEST_HEAL } from '../data/zones.js';
import { EVENTS } from '../data/events.js';
import { TRAITS } from '../data/traits.js';
import { xpToNext } from '../data/progression.js';
import { text } from '../ui/font.js';
import { drawMapBackground } from '../ui/backdrop.js';
import { panel, pixelLine, pixelCircle } from '../ui/pixel.js';
import { choose } from '../ui/popup.js';
import {
  session, reachable, zoneOf, dinoStats, dinoName, skinOf, groupName,
  heal, hurt, addStat, gainXp, fossilOffers
} from '../run/run.js';
import { Fx } from '../systems/fx.js';
import { sfx } from '../systems/sfx.js';

const LANE_Y = [72, 104, 136];
const colX = (row) => 34 + row * 38;
const ICON = { fight: 'icon_fight', elite: 'icon_elite', nest: 'icon_nest', fossil: 'icon_fossil', meteor: 'icon_meteor' };

// Zone map: pick the next node, travel, resolve it.
export class MapScene extends Phaser.Scene {
  constructor() { super('Map'); }

  create() {
    this.run = session.run;
    if (!this.run) { this.scene.start('Hatch'); return; }
    this.d = this.run.dino;
    this.fx = new Fx(this);
    this.busy = false;
    this.cameras.main.fadeIn(200);

    drawMapBackground(this, this.run.zone);
    this.edges = this.add.graphics().setDepth(2);
    this.rings = this.add.graphics().setDepth(4);
    this.time.addEvent({ delay: 380, loop: true, callback: () => this.rings.setVisible(!this.rings.visible) });
    this.icons = {};
    for (const n of Object.values(this.run.map.nodes)) this.addNode(n);
    this.marker = this.add.image(0, 0, skinOf(this.d.species, this.d.evo)).setOrigin(0.5, 1).setDepth(6);
    const here = this.pos(this.run.at);
    this.marker.setPosition(here.x, here.y - 6);

    this.buildHud();
    panel(this.add.graphics().setDepth(10), 4, 160, W - 8, 16);
    this.tip = text(this, W / 2, 164, '', { origin: [0.5, 0] }).setDepth(11);

    this.onKey = (e) => this.key(e);
    this.input.keyboard.on('keydown', this.onKey);
    this.events.once('shutdown', () => this.input.keyboard?.off('keydown', this.onKey));
    this.sel = 0;
    this.refresh();
  }

  update(_, dt) { this.fx.update(dt); }

  pos(id) {
    if (!id) return { x: 10, y: LANE_Y[1] };
    const n = this.run.map.nodes[id];
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
    const zone = this.add.zone(x, y, 36, 32).setInteractive({ useHandCursor: true });
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
        pixelLine(this.edges, a.x + 9, a.y, b.x - ex, b.y, color, 1, traveled ? 1 : 2);
      }
      this.icons[n.id].setTint(n.done ? 0x707070 : 0xffffff).setAlpha(n.done || opts.includes(n.id) ? 1 : 0.7);
    }
    if (!this.run.at) pixelLine(this.edges, 18, LANE_Y[1], colX(0) - 9, LANE_Y[1], 0xfff096, 1, 2);
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
    if (!n.enemies) return NODE_INFO[n.type];
    return `${NODE_INFO[n.type]}: ${groupName(n)}${n.type === 'boss' ? '' : ` LV${n.enemies[0].level}`}`;
  }

  buildHud() {
    panel(this.add.graphics().setDepth(10), 4, 4, W - 8, 34);
    this.hName = text(this, 8, 8, '').setDepth(11);
    this.hBars = this.add.graphics().setDepth(11);
    this.hearts = Array.from({ length: this.run.maxLives }, (_, i) =>
      this.add.image(112 + i * 9, 7, 'heart').setOrigin(0).setDepth(11));
    this.hHp = text(this, 112, 16, '', { color: COLORS.textDim, shadow: false }).setDepth(11);
    this.hXp = text(this, 112, 25, '', { color: COLORS.textDim, shadow: false }).setDepth(11);
    text(this, W - 8, 8, zoneOf(this.run).name, { color: COLORS.accent, origin: [1, 0] }).setDepth(11);
    this.hAmber = text(this, W - 8, 17, '', { color: '#e8a030', origin: [1, 0], shadow: false }).setDepth(11);
    this.hTraits = text(this, W - 8, 26, '', { color: COLORS.textDim, origin: [1, 0], shadow: false }).setDepth(11);
  }

  updateHud() {
    const d = this.d, max = dinoStats(d).hp, need = xpToNext(d.level);
    this.hName.setText(`${dinoName(d)}  LV${d.level}`);
    this.hearts.forEach((h, i) => h.setTexture(i < this.run.lives ? 'heart' : 'heart_empty'));
    const g = this.hBars.clear();
    g.fillStyle(0x0c0e12).fillRect(7, 17, 102, 7).fillRect(7, 26, 102, 5);
    g.fillStyle(0x1a1d23).fillRect(8, 18, 100, 5).fillRect(8, 27, 100, 3);
    const k = d.hp / max;
    g.fillStyle(k > 0.5 ? 0x5ca048 : k > 0.25 ? 0xe0b040 : 0xc8281e).fillRect(8, 18, Math.round(100 * k), 5);
    g.fillStyle(0x5aa0e0).fillRect(8, 27, Math.round((100 * d.xp) / need), 3);
    this.hHp.setText(`HP ${d.hp}/${max}`);
    this.hXp.setText(`XP ${d.xp}/${need}`);
    this.hAmber.setText(`+${this.run.amber} AMBER`);
    this.hTraits.setText(d.traits.map((t) => TRAITS[t].short).join(' '));
  }

  /* ---------- input + travel ---------- */

  key(e) {
    if (this.busy || e.repeat) return;
    const opts = this.options();
    if (e.code === 'ArrowUp' || e.code === 'KeyW') this.sel = (this.sel + opts.length - 1) % opts.length;
    else if (e.code === 'ArrowDown' || e.code === 'KeyS') this.sel = (this.sel + 1) % opts.length;
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
      this.time.delayedCall(350, () => this.cameras.main.fadeOut(200));
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Battle', { node: node.id }));
      return;
    }
    if (node.type === 'nest') {
      const amt = heal(d, NEST_HEAL);
      sfx('levelup');
      this.updateHud();
      const result = amt > 0 ? `+${amt} HP` : 'ALREADY AT FULL HP.';
      await choose(this, { title: 'NEST', lines: ['YOU CURL UP AND REST.', result], options: [{ label: 'CONTINUE' }] });
    } else if (node.type === 'fossil') {
      sfx('ding');
      const offers = fossilOffers(run);
      const i = await choose(this, { title: 'FOSSIL DIG', lines: ['OLD BONES IN THE MUD.', 'TAKE ONE:'], options: offers });
      offers[i].apply();
      sfx('levelup');
    } else if (node.type === 'meteor') {
      sfx('tell');
      const ev = run.rng.pick(EVENTS);
      const i = await choose(this, { title: ev.title, lines: ev.lines, options: ev.options });
      const result = ev.options[i].run(this.eventCtx()).filter(Boolean);
      this.updateHud();
      await choose(this, { title: ev.title, lines: result, options: [{ label: 'CONTINUE' }] });
    }
    if (d.pendingEvo) { this.scene.start('Evolution'); return; }
    this.busy = false;
    this.sel = 0;
    this.refresh();
  }

  // Helpers handed to Meteor Shard events; each returns a result line.
  eventCtx() {
    const d = this.d;
    return {
      rng: this.run.rng,
      stat: (k, n) => { addStat(d, k, n); return `+${n} ${k.toUpperCase()}`; },
      hurt: (f) => { sfx('hit'); this.fx.shake(2, 150); return `-${hurt(d, f)} HP`; },
      heal: (f) => `+${heal(d, f)} HP`,
      xp: (n) => {
        const lv = gainXp(d, n);
        return [`+${n} XP`, lv ? `LEVEL UP! LV${d.level}` : null];
      }
    };
  }
}
