import { sfx } from '../systems/sfx.js';

// Keyboard focus over a set of Buttons (ui/button.js).
//   Arrow keys     move to the nearest button in that direction
//   Enter / Space  press the focused button
//   Esc / Backspace  onBack()
// The focus ring shows once a key is used (or right away with show: true, as in
// popups), so mouse and touch players never see it. Moving the pointer hides it.
// Scenes call nav.handle(e) first in their own keydown handler; it returns true when
// it used the key. A modal nav (popups) blocks the scene's other navs while it is open.
// Arrow keys only: letters are hotkeys on several screens (S settings, D dex, E end turn).
const DIRS = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };

export class FocusNav {
  // items: () => Button[] (read each time, so redrawn lists keep working).
  constructor(scene, { items, onBack = null, start = 0, show = false, modal = false }) {
    Object.assign(this, { scene, items, onBack, modal });
    this.i = start;
    this.shown = false;
    this.ring = scene.add.graphics();
    if (modal) scene.__modal = (scene.__modal ?? 0) + 1;
    this.onMove = () => { if (this.shown) { this.shown = false; this.paint(); } };
    scene.input.on('pointermove', this.onMove);
    scene.events.once('shutdown', () => this.destroy());
    if (show) this.show();
  }

  get list() { return this.items().filter((b) => b?.g?.scene); }
  get current() { return this.list[this.i] ?? null; }

  show() { this.shown = true; this.clamp(); this.paint(); }

  clamp() {
    const n = this.list.length;
    this.i = n ? Math.max(0, Math.min(n - 1, this.i)) : 0;
  }

  // Redraw the ring after the scene rebuilt its buttons.
  refresh() { this.clamp(); this.paint(); }

  focus(b) {
    const i = this.list.indexOf(b);
    if (i >= 0) { this.i = i; this.show(); }
  }

  paint() {
    for (const b of this.list) if (b.focused) { b.focused = false; b.hover = false; b.draw(); }
    this.ring.clear();
    const b = this.current;
    if (!this.shown || !b) return;
    b.focused = true;
    b.hover = true;
    b.draw();
    this.ring.setDepth(b.g.depth + 2).setScrollFactor(b.g.scrollFactorX);
    this.ring.lineStyle(1, 0xfff096).strokeRect(b.x - 0.5, b.y - 0.5, b.w + 1, b.h + 1);
  }

  // Returns true when the key was used.
  handle(e) {
    if (e.repeat || this.dead) return false;
    if (!this.modal && this.scene.__modal > 0) return false; // a popup has the keys
    const code = e.code;
    if ((code === 'Escape' || code === 'Backspace') && this.onBack) { this.onBack(); return true; }
    if ((code === 'Enter' || code === 'Space') && this.shown && this.current) { this.current.click(); return true; }
    const dir = DIRS[code];
    if (!dir || !this.list.length) return false;
    if (!this.shown) { this.show(); return true; } // the first press just shows where you are
    const next = this.nearest(dir);
    if (next < 0) return false; // nothing that way: the scene may use the key
    this.i = next;
    this.paint();
    sfx('tick');
    return true;
  }

  // The closest button in direction (dx, dy): along-axis distance plus twice the sideways
  // offset. Left / Right only reach buttons that share some height with this one.
  nearest([dx, dy]) {
    const list = this.list, c = list[this.i];
    if (!c) return 0;
    const cx = c.x + c.w / 2, cy = c.y + c.h / 2;
    let best = -1, score = Infinity;
    list.forEach((b, j) => {
      if (j === this.i) return;
      const bx = b.x + b.w / 2, by = b.y + b.h / 2;
      const along = (bx - cx) * dx + (by - cy) * dy, side = Math.abs((bx - cx) * dy) + Math.abs((by - cy) * dx);
      if (along <= 0) return;
      if (dx && (b.y >= c.y + c.h || b.y + b.h <= c.y)) return; // Left / Right stay in the same row
      const s = along + side * 2;
      if (s < score) { score = s; best = j; }
    });
    return best;
  }

  destroy() {
    if (this.dead) return;
    this.dead = true;
    if (this.modal) this.scene.__modal = Math.max(0, (this.scene.__modal ?? 1) - 1);
    this.scene.input?.off('pointermove', this.onMove);
    if (this.ring.scene) this.ring.destroy();
  }
}
