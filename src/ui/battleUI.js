import { W, H, COLORS, PORTRAIT, lp } from '../config.js';
import { MOVES } from '../data/moves.js';
import { MUTATIONS } from '../data/mutations.js';
import { blocked, affordable, intentView, maxEnergy, moveCost } from '../systems/battleState.js';
import { mutation } from '../systems/build.js';
import { Button } from './button.js';
import { FocusNav } from './focus.js';
import { panel } from './pixel.js';
import { text } from './font.js';

// HUD panel width: landscape side by side, portrait full width (enemy top, player under the stage).
const panelW = () => lp(120, W - 8);
export const PLAYER_HUD_Y = () => lp(4, 202);
const markTop = () => lp(78, 116); // highest sprite top the enemy markers stack above

// Status tags: [status key, label, color, show turns?]
const PLAYER_TAGS = [
  ['atkDown', 'ATK-', '#e06060', true], ['defUp', 'DEF+', '#7fb0ff', true], ['poison', 'PSN', '#80d060', true],
  ['stun', 'STUN', '#fff096', false], ['braced', 'BRACE', '#9ab8ff', false], ['muddy', 'MUD', '#b09a62', false],
  ['drain', '-EN', '#e0a040', false], ['blind', 'BLIND', '#c070ff', false], ['hooked', 'HOOKED', '#ff6040', false]
];
const ENEMY_TAGS = [
  ['atkDown', 'ATK-', '#e06060', true], ['poison', 'PSN', '#80d060', true], ['bleed', 'BLEED', '#e43b44', true], ['stun', 'STUN', '#fff096', false],
  ['guard', 'GUARD', '#9ab8ff', false], ['charging', 'CHARGE', '#ff6040', false], ['submerged', 'UNDER', '#5aa0e0', false],
  ['lowWater', 'LOW', '#5aa0e0', false], ['hooking', 'HOLDING', '#ff6040', false]
];
const tint = (c) => parseInt(c.slice(1), 16);

// Name + HP bar (white damage trail) + status tags. bind(f) switches fighter
// (the enemy panel follows the current target). The player panel also shows
// energy pips and the crit streak.
export class Hud {
  constructor(scene, side, st = null) {
    this.side = side;
    this.st = st;
    const PW = this.pw = panelW(), x = side === 'player' ? 4 : W - 4 - PW, y = side === 'player' ? PLAYER_HUD_Y() : 4;
    this.hpW = PW - 12;
    Object.assign(this, { x, y, bx: x + 6, by: y + 15 });
    panel(scene.add.graphics().setDepth(10), x, y, PW, 32);
    this.name = text(scene, x + 6, y + 5, '').setDepth(11);
    this.lv = text(scene, x + PW - 6, y + 5, '', { color: COLORS.textDim, origin: [1, 0] }).setDepth(11);
    this.bar = scene.add.graphics().setDepth(11);
    this.hpText = text(scene, x + 6, y + 23, '', { color: '#c0cbdc', small: true }).setDepth(11);
    this.tags = Array.from({ length: 6 }, () => text(scene, 0, y + 34, '').setDepth(11));
  }

  bind(f) {
    if (this.f === f) return;
    this.f = f;
    // A name too long for the panel drops leading words: "ELITE DIMETRODON" turns gold
    // instead, "ABYSS MOSASAUR" becomes "MOSASAUR". Anything still too long is cut.
    const lv = f.levelLabel ?? `LV${f.level}`, room = Math.floor((this.pw - 18 - lv.length * 6) / 6);
    let name = String(f.name), elite = false;
    while (name.length > room && name.includes(' ')) { elite ||= name.startsWith('Elite '); name = name.slice(name.indexOf(' ') + 1); }
    this.name.setText(name.slice(0, room));
    this.name.label.setTint(elite ? 0xffd040 : tint(COLORS.text));
    this.lv.setText(lv);
    this.lv.label.setTint(f.levelLabel ? 0xff6040 : tint(COLORS.textDim));
    this.shown = this.trail = f.hp;
    this.delay = 0;
  }

  update(dt) {
    const f = this.f;
    if (!f) return;
    if (f.hp !== this.shown) {
      if (f.hp < this.shown) this.delay = 280;
      this.shown = f.hp;
    }
    if (this.trail < this.shown) this.trail = this.shown;
    if (this.delay > 0) this.delay -= dt;
    else if (this.trail > this.shown) this.trail = Math.max(this.shown, this.trail - (dt * f.maxHp) / 700);

    const k = this.shown / f.maxHp;
    const col = k > 0.5 ? 0x5ca048 : k > 0.25 ? 0xe0b040 : 0xc8281e;
    const g = this.bar.clear(), { bx, by } = this;
    const HP_W = this.hpW;
    g.fillStyle(0x0c0e12).fillRect(bx - 1, by - 1, HP_W + 2, 7);
    g.fillStyle(0x1a1d23).fillRect(bx, by, HP_W, 5);
    g.fillStyle(0xffffff).fillRect(bx, by, Math.round((HP_W * this.trail) / f.maxHp), 5);
    g.fillStyle(col).fillRect(bx, by, Math.round(HP_W * k), 5);
    g.fillStyle(0xffffff, 0.35).fillRect(bx, by, Math.round(HP_W * k), 1);
    this.hpText.setText(`HP ${f.hp}/${f.maxHp}`);

    if (this.st) { // energy pips, right of the HP text
      const max = maxEnergy(this.st);
      for (let i = 0; i < max; i++) {
        const px = this.x + this.pw - 8 - (max - 1 - i) * 8, py = this.y + 23;
        g.fillStyle(0x0c0e12).fillRect(px - 1, py - 1, 7, 7);
        g.fillStyle(i < this.st.energy ? 0xfff096 : 0x3a3e48).fillRect(px, py, 5, 5);
        if (i < this.st.energy) g.fillStyle(0xffffff).fillRect(px, py, 2, 1);
      }
    }
    this.drawTags();
  }

  drawTags() {
    const f = this.f, list = [];
    for (const [key, label, color, turns] of this.side === 'player' ? PLAYER_TAGS : ENEMY_TAGS) {
      const n = f.status[key];
      if (n > 0) list.push([turns ? `${label}${n}` : label, color]);
    }
    if (this.st?.fatigue > 0) list.push([`TIRED${Math.min(4, this.st.fatigue)}`, '#f77622']);
    if (this.st?.empowered) list.unshift(['POWER!', '#ffd040']);
    else if (this.st?.streak > 0) list.unshift([`CRIT${this.st.streak}`, '#ffd040']);
    let tx = this.x + 2;
    this.tags.forEach((t, i) => {
      const [s, color] = list[i] ?? ['', '#ffffff'];
      t.setText(s);
      t.label.setTint(tint(color));
      t.x = tx; // tag was built at x=0, so the container offset is its position
      if (s) tx += s.length * 6 + 4;
    });
  }
}

// Floating markers over every enemy: intent icon + number, a thin HP bar,
// the target arrow, and a tap zone to pick the target.
export class EnemyMarkers {
  constructor(scene, onPick) {
    Object.assign(this, { scene, onPick, items: new Map(), showIntents: true });
    this.arrow = scene.add.image(0, 0, 'target_arrow').setOrigin(0.5, 0).setDepth(15);
  }

  add(e) {
    const s = this.scene;
    const zone = s.add.zone(0, 0, 10, 10).setOrigin(0.5, 1).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => this.onPick(e));
    this.items.set(e, {
      g: s.add.graphics().setDepth(13),
      icon: s.add.image(0, 0, 'int_attack').setOrigin(0).setDepth(14),
      flag: s.add.image(0, 0, 'int_ring_red').setOrigin(0).setDepth(14).setVisible(false),
      label: text(s, 0, 0, '').setDepth(14),
      zone
    });
  }

  remove(e) {
    const it = this.items.get(e);
    if (!it) return;
    for (const o of [it.g, it.icon, it.flag, it.label, it.zone]) o.destroy();
    this.items.delete(e);
  }

  update(st, target, time) {
    for (const [e, it] of this.items) {
      // Tall 3x sprites: keep the marker stack (arrow, intent, HP) below the HUD panels.
      const r = e.rig, x = Math.round(r.homeX), top = Math.max(markTop(), r.homeY - r.h * r.scale);
      it.zone.setPosition(x, r.homeY).setSize(r.halfW * 2, r.h * r.scale);
      const g = it.g.clear(), bw = 28, k = Math.max(0, e.hp / e.maxHp);
      g.fillStyle(0x0c0e12).fillRect(x - bw / 2 - 1, top - 7, bw + 2, 4);
      g.fillStyle(k > 0.5 ? 0x5ca048 : k > 0.25 ? 0xe0b040 : 0xc8281e).fillRect(x - bw / 2, top - 6, Math.round(bw * k), 2);
      const v = this.showIntents ? intentView(st, e) : null;
      it.icon.setVisible(!!v);
      it.label.setVisible(!!v);
      it.flag.setVisible(!!v?.ringIcon);
      if (v) {
        const lw = v.label ? 2 + v.label.length * 6 : 0, w = 8 + lw + (v.ringIcon ? 9 : 0), x0 = Math.round(x - w / 2), y0 = top - 18;
        it.icon.setTexture(v.icon).setPosition(x0, y0);
        it.label.setText(v.label).setPosition(x0 + 10, y0 + 1);
        const tint = v.ring === 'red' ? 0xff6060 : v.ring === 'purple' ? 0xd090ff : v.kind === 'charge' ? 0xff6040 : v.kind === 'ambush' ? 0x7fe0ff : 0xffffff;
        it.label.label.setTint(tint);
        if (v.ringIcon) it.flag.setTexture(v.ringIcon).setPosition(x0 + 10 + lw, y0);
      }
    }
    const t = this.items.has(target) && this.showIntents ? target : null;
    this.arrow.setVisible(!!t);
    if (t) this.arrow.setPosition(t.rig.homeX, Math.max(markTop(), t.rig.homeY - t.rig.h * t.rig.scale) - 27 + (Math.floor(time / 250) % 2));
  }
}

// 8x8 icon per move (sprites/moveIcons.js): base moves by id, the special by species.
const iconOf = (id, species) => (['bite', 'tail', 'roar', 'brace'].includes(id) ? `mi_${id}` : `mi_${species}`);

// Bottom bar: the 5 moves (key 1–5) with energy-cost pips, plus END TURN (key E).
export class MoveBar {
  constructor(scene, st, { onDeny }) {
    this.st = st;
    this.on = false;
    this.cb = null;
    // Landscape: one row of 6 along the bottom. Portrait: a 3x2 grid.
    const top = lp(140, 246);
    const bg = scene.add.graphics().setDepth(10);
    bg.fillStyle(0x16181d).fillRect(0, top, W, H - top);
    bg.fillStyle(0x0c0e12).fillRect(0, top, W, 1);
    bg.fillStyle(0x2e333d).fillRect(0, top + 1, W, 1);

    const p = st.player, gap = 3, bw = lp(49, 56), bh = 34;
    const cell = (i) => (PORTRAIT ? [3 + (i % 3) * (bw + 3), top + 3 + Math.floor(i / 3) * (bh + 2)] : [3 + i * (bw + gap), top + 4]);
    this.btns = p.moves.map((id, i) => {
      const mu = MUTATIONS[id]?.[mutation(st, id)]; // mutated moves get new text + a colored badge
      const b = new Button(scene, ...cell(i), bw, bh, {
        key: String(i + 1), label: (mu?.btn ?? MOVES[id].btn) + '+'.repeat(p.moveUps[id] ?? 0), sub: mu?.desc ?? MOVES[id].desc,
        cost: moveCost(st, id), textTop: 4, onClick: () => this.pick(id), onDeny: () => this.on && onDeny(blocked(st, id))
      });
      if (mu) scene.add.rectangle(b.x + 8, b.y + 4, 4, 3, mu.color).setOrigin(0).setDepth(13); // badge beside the key number
      b.icon = scene.add.image(b.x + Math.floor(bw / 2) - 4, b.y + 2, iconOf(id, p.species)).setOrigin(0).setDepth(13);
      return b;
    });
    const [ex, ey] = cell(5), ew = PORTRAIT ? bw : W - 3 - ex;
    this.end = new Button(scene, ex, ey, ew, bh, { key: 'E', label: 'END', sub: 'TURN', textTop: 4, onClick: () => this.pick('end') });
    this.end.icon = scene.add.image(ex + Math.floor(ew / 2) - 4, ey + 2, 'mi_end').setOrigin(0).setDepth(13);

    // Arrows walk the bar spatially (a row in landscape, a 3x2 grid in portrait); Tab picks the target.
    this.nav = new FocusNav(scene, { items: () => [...this.btns, this.end] });
    this.onKey = (e) => {
      if (e.repeat || (this.on && this.nav.handle(e))) return;
      const i = '12345'.indexOf(e.key);
      if (i >= 0) this.btns[i].click();
      else if (e.code === 'KeyE') this.end.click();
    };
    scene.input.keyboard.on('keydown', this.onKey);
    scene.events.once('shutdown', () => scene.input.keyboard?.off('keydown', this.onKey));
    this.draw();
  }

  // Resolves with a move id, or 'end'.
  choose() {
    return new Promise((res) => { this.cb = res; this.on = true; this.draw(); });
  }

  pick(id) {
    const cb = this.cb;
    this.on = false;
    this.cb = null;
    this.draw();
    cb?.(id);
  }

  draw() {
    this.st.player.moves.forEach((id, i) => {
      this.btns[i].cost = moveCost(this.st, id);
      this.btns[i].setEnabled(this.on && !blocked(this.st, id));
      this.btns[i].icon.setAlpha(this.btns[i].enabled ? 1 : 0.45);
    });
    this.end.setEnabled(this.on);
    this.end.setText(null, this.on && !affordable(this.st) ? 'TURN <' : 'TURN');
  }
}
