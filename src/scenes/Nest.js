import { syncLayout } from '../systems/screen.js';
import { amberCount, AMB } from '../ui/amber.js';
import { W, H, COLORS, PORTRAIT, lp } from '../config.js';
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
//   goals    the goals and what each one unlocks
//   family   the family tree: every past dino, newest first
// Each is a paged list; the footer has PREV / NEXT / BACK. Rows per page and
// row height follow the layout (portrait fits more, taller rows).
const MODES = {
  unlocks: { title: 'NEST UNLOCKS', per: () => lp(5, 9), row: () => lp(26, 30) },
  goals: { title: 'GOALS', per: () => lp(6, 9), row: () => lp(21, 30) },
  family: { title: 'FAMILY TREE', per: () => lp(4, 7), row: () => lp(32, 38) }
};
const TOP = 20;

export class Nest extends Phaser.Scene {
  constructor() { super('Nest'); }

  create(data) {
    syncLayout(this);
    this.mode = MODES[data.mode] ? data.mode : 'unlocks';
    this.page = 0;
    this.rows = [];
    this.cameras.main.fadeIn(150);
    this.add.graphics().fillStyle(0x16181d).fillRect(0, 0, W, H);
    this.titleText = text(this, 6, 6, '', { color: COLORS.accent });
    this.amber = amberCount(this, W - 6, 6, meta.amber);

    const foot = H - 28;
    const [pw, bw] = lp([70, 84], [46, 46]);
    this.prev = new Button(this, 4, foot, pw, 24, { key: 'Q', label: 'PREV', onClick: () => this.flip(-1) });
    this.next = new Button(this, 8 + pw, foot, pw, 24, { key: 'E', label: 'NEXT', onClick: () => this.flip(1) });
    const right = 8 + 2 * pw, backX = W - 4 - bw;
    this.pageText = text(this, Math.round((right + backX) / 2), foot + 8, '', { color: COLORS.textDim, origin: [0.5, 0], shadow: false });
    this.back = new Button(this, backX, foot, bw, 24, { key: 'ESC', label: 'BACK', onClick: () => this.leave() });
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

  pages() { return Math.max(1, Math.ceil(this.items().length / MODES[this.mode].per())); }

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
    const { title } = MODES[this.mode], per = MODES[this.mode].per();
    const sub = this.mode === 'goals' ? ` ${goalsDone()}/${GOAL_ORDER.length}` : this.mode === 'family' ? ` ${meta.fossils.length}` : '';
    this.titleText.setText(title + sub);
    this.amber.set(meta.amber);
    const n = this.pages();
    this.page = Math.min(this.page, n - 1);
    this.pageText.setText(`${this.page + 1}/${n}`);
    this.prev.setEnabled(n > 1);
    this.next.setEnabled(n > 1);
    const list = this.items().slice(this.page * per, (this.page + 1) * per);
    if (!list.length) this.rows.push(text(this, W / 2, 70, lp('NO ANCESTORS YET. GO HATCH ONE!', 'NO ANCESTORS YET.'), { origin: [0.5, 0], color: COLORS.textDim, shadow: false }));
    const rh = MODES[this.mode].row();
    list.forEach((item, i) => this[`${this.mode}Row`](item, TOP + i * rh, rh));
  }

  /* ---------- rows ---------- */

  unlocksRow(id, y, rh) {
    const u = UNLOCKS[id], lv = owned(id), max = levelsOf(id), maxed = lv >= max;
    const price = maxed ? 0 : priceOf(id, lv);
    const tag = max > 1 ? ` ${lv}/${max}` : '';
    const locked = u.needs && !owned(u.needs);
    const b = new Button(this, 4, y, W - 8, rh - 2, {
      label: `${u.name.toUpperCase()}${tag}${maxed ? '' : `  ${price}${AMB}`}`,
      sub: maxed ? 'OWNED' : locked ? `NEEDS ${UNLOCKS[u.needs].name.toUpperCase()}` : u.desc,
      onClick: () => this.buy(id)
    }).setEnabled(!locked && !maxed && meta.amber >= price);
    this.rows.push(b);
    if (maxed) b.label.label.setTint(0x7fe0ff);
  }

  buy(id) {
    if (!buyUnlock(id)) return;
    sfx('levelup');
    this.cameras.main.flash(120, 255, 240, 150);
    this.draw();
  }

  // Landscape: name + reward on one line, description below.
  // Portrait: name, description, reward on three lines.
  goalsRow(id, y0) {
    const g = GOALS[id], done = !!meta.goals[id], y = y0 + 2;
    const box = this.add.graphics();
    box.fillStyle(0x0c0e12).fillRect(6, y, 8, 8);
    box.fillStyle(done ? 0x7fd060 : 0x2e333d).fillRect(7, y + 1, 6, 6);
    const reward = PORTRAIT
      ? text(this, 18, y + 18, rewardText(g.reward), { color: done ? '#7a6a50' : '#e8a030', small: true })
      : text(this, 314, y, rewardText(g.reward), { color: done ? '#7a6a50' : '#e8a030', origin: [1, 0], shadow: false });
    this.rows.push(
      box, reward,
      text(this, 18, y, g.name.toUpperCase(), { color: done ? COLORS.accent : COLORS.text, shadow: false }),
      text(this, 18, y + 10, g.desc, { color: COLORS.textDim, small: true })
    );
  }

  familyRow(f, y, rh) {
    const cy = y + Math.floor(rh / 2), lx = lp(50, 44);
    const g = this.add.graphics();
    g.fillStyle(0x3a3f4a).fillRect(lp(25, 19), y, 2, rh); // the bloodline
    panel(g, lx - 4, y + 1, W - lx, rh - 2, { fill: f.won ? 0x265c42 : 0x262b44, rivets: false });
    const key = skinOf(f.species, f.evo ?? 0);
    const icon = this.add.image(lp(26, 20), cy, this.textures.exists(key) ? key : f.species);
    if (PORTRAIT) icon.setScale(icon.width > 36 ? 0.5 : 1); // big forms stay inside the narrow column
    if (!f.won) icon.setTint(0xb0a890);
    const zone = ZONES[f.zone]?.name ?? '???';
    const fate = f.won ? `CLEARED THE RUN${f.ext ? ` (EXTINCTION ${f.ext})` : ''}` : `FELL TO ${String(f.cause ?? '???').toUpperCase()} - ${zone} ${f.col ?? 0}`;
    const passed = [f.inherited && `GOT ${f.inherited.toUpperCase()}`, f.passed && `GAVE ${f.passed.toUpperCase()}`].filter(Boolean).join('  ');
    const name = dinoName({ species: f.species, evo: f.evo ?? 0 }).toUpperCase();
    const lines = PORTRAIT
      ? [[name, null], [`GEN ${f.gen ?? '?'}  LV${f.level}`, COLORS.textDim], [fate, f.won ? '#7fe0ff' : '#e08070'], [passed || 'NO INHERITANCE', passed ? '#e8a030' : COLORS.textDim]]
      : [[`GEN ${f.gen ?? '?'}  ${name}  LV${f.level}`, null], [fate, f.won ? '#7fe0ff' : '#e08070'], [passed || 'NO INHERITANCE', passed ? '#e8a030' : COLORS.textDim]];
    this.rows.push(g, icon);
    lines.forEach(([s, color], i) => {
      const t = i === 0
        ? text(this, lx, y + 4, s, { shadow: false })
        : text(this, lx, y + 7 + i * 7, s, { color, small: true });
      if (i > 0 && PORTRAIT) t.setMaxWidth(W - lx - 4);
      this.rows.push(t);
    });
  }

  leave() {
    this.cameras.main.fadeOut(150);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Home'));
  }
}
