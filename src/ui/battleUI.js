import { W, H, COLORS } from '../config.js';
import { MOVES } from '../data/moves.js';
import { TRAITS } from '../data/traits.js';
import { isReady } from '../systems/combat.js';
import { Button } from './button.js';
import { panel } from './pixel.js';
import { text } from './font.js';

const PW = 120;
const HP_W = PW - 12;

// Status tags shown under the HUD panel: [status key, label, color, show turns?]
const TAGS = [
  ['atkDown', 'ATK-', '#e06060', true],
  ['defUp', 'DEF+', '#7fb0ff', true],
  ['poison', 'PSN', '#80d060', true],
  ['stun', 'STUN', '#fff096', false],
  ['charge', 'CHARGE', '#ff6040', false]
];

// Name + HP bar (with a white damage trail) + trait + status tags.
export class Hud {
  constructor(scene, f, side) {
    this.f = f;
    const x = side === 'player' ? 4 : W - 4 - PW, y = 4;
    this.x = x;
    this.bx = x + 6;
    this.by = y + 15;
    panel(scene.add.graphics().setDepth(10), x, y, PW, 32);
    text(scene, x + 6, y + 5, f.name).setDepth(11);
    text(scene, x + PW - 6, y + 5, f.levelLabel ?? `LV${f.level}`, { color: f.levelLabel ? '#ff6040' : COLORS.textDim, origin: [1, 0] }).setDepth(11);
    const trait = TRAITS[f.traits[0]];
    const more = f.traits.length > 1 ? `+${f.traits.length - 1}` : '';
    if (trait) text(scene, x + PW - 6, y + 23, trait.short + more, { color: '#e8a030', origin: [1, 0], shadow: false }).setDepth(11);
    this.bar = scene.add.graphics().setDepth(11);
    this.hpText = text(scene, x + 6, y + 23, '', { color: COLORS.textDim, shadow: false }).setDepth(11);
    this.tags = TAGS.map(([, , color]) => text(scene, 0, y + 34, '', { color }).setDepth(11));
    this.shown = f.hp;
    this.trail = f.hp;
    this.delay = 0;
  }

  update(dt) {
    const f = this.f;
    if (f.hp !== this.shown) {
      if (f.hp < this.shown) this.delay = 280;
      this.shown = f.hp;
    }
    if (this.trail < this.shown) this.trail = this.shown;
    if (this.delay > 0) this.delay -= dt;
    else if (this.trail > this.shown) this.trail = Math.max(this.shown, this.trail - (dt * f.maxHp) / 700);

    const k = this.shown / f.maxHp;
    const col = k > 0.5 ? 0x5ca048 : k > 0.25 ? 0xe0b040 : 0xc8281e;
    const fill = Math.round(HP_W * k), tr = Math.round((HP_W * this.trail) / f.maxHp);
    const g = this.bar.clear(), { bx, by } = this;
    g.fillStyle(0x0c0e12).fillRect(bx - 1, by - 1, HP_W + 2, 7);
    g.fillStyle(0x1a1d23).fillRect(bx, by, HP_W, 5);
    g.fillStyle(0xffffff).fillRect(bx, by, tr, 5);
    g.fillStyle(col).fillRect(bx, by, fill, 5);
    g.fillStyle(0xffffff, 0.35).fillRect(bx, by, fill, 1);
    this.hpText.setText(`HP ${f.hp}/${f.maxHp}`);

    // Lay active status tags out left to right.
    let tx = this.x + 2;
    TAGS.forEach(([key, label, , turns], i) => {
      const n = f.status[key], t = this.tags[i];
      const s = n > 0 ? (turns ? `${label}${n}` : label) : '';
      t.setText(s);
      t.x = tx; // tag was built at x=0, so the container offset is its position
      if (s) tx += s.length * 6 + 4;
    });
  }
}

// The 4 move buttons along the bottom. Click/tap or keys 1–4.
export class MoveButtons {
  constructor(scene, f) {
    this.f = f;
    this.on = false;
    this.cb = null;

    const top = 140;
    const bg = scene.add.graphics().setDepth(10);
    bg.fillStyle(0x16181d).fillRect(0, top, W, H - top);
    bg.fillStyle(0x0c0e12).fillRect(0, top, W, 1);
    bg.fillStyle(0x2e333d).fillRect(0, top + 1, W, 1);

    const gap = 4, bw = Math.floor((W - gap * 5) / 4);
    this.btns = f.moves.map((id, i) => new Button(scene, gap + i * (bw + gap), top + 4, bw, 34, {
      key: String(i + 1), label: MOVES[id].label + '+'.repeat(f.moveUps[id] ?? 0), onClick: () => this.pick(id)
    }));

    this.onKey = (e) => {
      if (e.repeat) return;
      const i = '1234'.indexOf(e.key);
      if (i >= 0) this.btns[i].click();
    };
    scene.input.keyboard.on('keydown', this.onKey);
    scene.events.once('shutdown', () => scene.input.keyboard?.off('keydown', this.onKey));
    this.draw();
  }

  // Resolves with the chosen move id.
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
    this.f.moves.forEach((id, i) => {
      const ready = isReady(this.f, id);
      this.btns[i].setText(null, ready ? MOVES[id].desc : `WAIT ${this.f.cd[id]}`).setEnabled(this.on && ready);
    });
  }
}
