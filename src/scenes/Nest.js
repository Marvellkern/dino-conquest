import { W, COLORS } from '../config.js';
import { UNLOCKS, UNLOCK_ORDER, levelsOf, priceOf } from '../data/unlocks.js';
import { GOALS, GOAL_ORDER } from '../data/goals.js';
import { ZONES } from '../data/zones.js';
import { text } from '../ui/font.js';
import { panel } from '../ui/pixel.js';
import { Button } from '../ui/button.js';
import { meta, owned, buyUnlock } from '../systems/meta.js';
import { rewardText, goalsDone } from '../systems/goals.js';
import { dinoName, skinOf } from '../run/run.js';
import { sfx } from '../systems/sfx.js';

// Nest sub-screens, one per mode (data.mode):
//   unlocks  spend banked Amber on permanent unlocks
//   goals    the 20 goals and what each one unlocks
//   family   the family tree: every past dino, newest first
// Each is a paged list; the footer has PREV / NEXT / BACK.
const MODES = {
  unlocks: { title: 'NEST UNLOCKS', per: 5 },
  goals: { title: 'GOALS', per: 6 },
  family: { title: 'FAMILY TREE', per: 4 }
};
const TOP = 20, FOOT = 152;

export class Nest extends Phaser.Scene {
  constructor() { super('Nest'); }

  create(data) {
    this.mode = MODES[data.mode] ? data.mode : 'unlocks';
    this.page = 0;
    this.rows = [];
    this.cameras.main.fadeIn(150);
    this.add.graphics().fillStyle(0x16181d).fillRect(0, 0, W, 180);
    this.titleText = text(this, 6, 6, '', { color: COLORS.accent });
    this.amberText = text(this, W - 6, 6, '', { color: '#e8a030', origin: [1, 0] });

    this.prev = new Button(this, 4, FOOT, 70, 24, { key: 'Q', label: 'PREV', onClick: () => this.flip(-1) });
    this.next = new Button(this, 78, FOOT, 70, 24, { key: 'E', label: 'NEXT', onClick: () => this.flip(1) });
    this.pageText = text(this, 190, FOOT + 8, '', { color: COLORS.textDim, origin: [0.5, 0], shadow: false });
    this.back = new Button(this, 232, FOOT, 84, 24, { key: 'ESC', label: 'BACK', onClick: () => this.leave() });
    this.onKey = (e) => {
      if (e.repeat) return;
      if (e.code === 'KeyQ' || e.code === 'ArrowLeft') this.prev.click();
      else if (e.code === 'KeyE' || e.code === 'ArrowRight') this.next.click();
      else if (e.code === 'Escape' || e.code === 'Backspace') this.back.click();
    };
    this.input.keyboard.on('keydown', this.onKey);
    this.events.once('shutdown', () => this.input.keyboard?.off('keydown', this.onKey));
    this.draw();
  }

  items() {
    if (this.mode === 'unlocks') return UNLOCK_ORDER;
    if (this.mode === 'goals') return GOAL_ORDER;
    return [...meta.fossils].reverse();
  }

  pages() { return Math.max(1, Math.ceil(this.items().length / MODES[this.mode].per)); }

  flip(dir) {
    const n = this.pages();
    if (n < 2) return;
    this.page = (this.page + dir + n) % n;
    sfx('tick');
    this.draw();
  }

  draw() {
    for (const r of this.rows) r.destroy();
    this.rows = [];
    const { title, per } = MODES[this.mode];
    const sub = this.mode === 'goals' ? ` ${goalsDone()}/${GOAL_ORDER.length}` : this.mode === 'family' ? ` ${meta.fossils.length}` : '';
    this.titleText.setText(title + sub);
    this.amberText.setText(`AMBER ${meta.amber}`);
    const n = this.pages();
    this.page = Math.min(this.page, n - 1);
    this.pageText.setText(`${this.page + 1}/${n}`);
    this.prev.setEnabled(n > 1);
    this.next.setEnabled(n > 1);
    const list = this.items().slice(this.page * per, (this.page + 1) * per);
    if (!list.length) this.rows.push(text(this, W / 2, 70, 'NO ANCESTORS YET. GO HATCH ONE!', { origin: [0.5, 0], color: COLORS.textDim, shadow: false }));
    list.forEach((item, i) => this[`${this.mode}Row`](item, i));
  }

  /* ---------- rows ---------- */

  unlocksRow(id, i) {
    const u = UNLOCKS[id], lv = owned(id), max = levelsOf(id), maxed = lv >= max;
    const price = maxed ? 0 : priceOf(id, lv);
    const tag = max > 1 ? ` ${lv}/${max}` : '';
    const b = new Button(this, 4, TOP + i * 26, 312, 24, {
      label: `${u.name.toUpperCase()}${tag}${maxed || u.soon ? '' : `  ${price} AMBER`}`,
      sub: u.soon ? 'COMING SOON' : maxed ? 'OWNED' : u.desc,
      onClick: () => this.buy(id)
    }).setEnabled(!u.soon && !maxed && meta.amber >= price);
    this.rows.push(b);
    if (maxed) b.label.label.setTint(0x7fe0ff);
  }

  buy(id) {
    if (!buyUnlock(id)) return;
    sfx('levelup');
    this.cameras.main.flash(120, 255, 240, 150);
    this.draw();
  }

  goalsRow(id, i) {
    const g = GOALS[id], done = !!meta.goals[id], y = TOP + 2 + i * 21;
    const box = this.add.graphics();
    box.fillStyle(0x0c0e12).fillRect(6, y, 8, 8);
    box.fillStyle(done ? 0x7fd060 : 0x2e333d).fillRect(7, y + 1, 6, 6);
    this.rows.push(
      box,
      text(this, 18, y, g.name.toUpperCase(), { color: done ? COLORS.accent : COLORS.text, shadow: false }),
      text(this, 314, y, rewardText(g.reward), { color: done ? '#7a6a50' : '#e8a030', origin: [1, 0], shadow: false }),
      text(this, 18, y + 9, g.desc, { color: COLORS.textDim, shadow: false })
    );
  }

  familyRow(f, i) {
    const y = TOP + i * 32, cy = y + 16;
    const g = this.add.graphics();
    g.fillStyle(0x3a3f4a).fillRect(25, y, 2, 32); // the bloodline
    panel(g, 46, y + 1, 270, 30, { fill: f.won ? 0x265c42 : 0x262b44, rivets: false });
    const key = skinOf(f.species, f.evo ?? 0);
    const icon = this.add.image(26, cy, this.textures.exists(key) ? key : f.species);
    if (!f.won) icon.setTint(0xb0a890);
    const zone = ZONES[f.zone]?.name ?? '???';
    const fate = f.won ? `CLEARED THE RUN${f.ext ? ` (EXTINCTION ${f.ext})` : ''}` : `FELL TO ${String(f.cause ?? '???').toUpperCase()} - ${zone} ${f.col ?? 0}`;
    const passed = [f.inherited && `GOT ${f.inherited.toUpperCase()}`, f.passed && `GAVE ${f.passed.toUpperCase()}`].filter(Boolean).join('  ');
    this.rows.push(
      g, icon,
      text(this, 50, y + 4, `GEN ${f.gen ?? '?'}  ${dinoName({ species: f.species, evo: f.evo ?? 0 }).toUpperCase()}  LV${f.level}`, { shadow: false }),
      text(this, 50, y + 13, fate, { color: f.won ? '#7fe0ff' : '#e08070', shadow: false }),
      text(this, 50, y + 22, passed || 'NO INHERITANCE', { color: passed ? '#e8a030' : COLORS.textDim, shadow: false })
    );
  }

  leave() {
    this.cameras.main.fadeOut(150);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Home'));
  }
}
