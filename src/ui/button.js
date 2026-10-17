import { COLORS } from '../config.js';
import { E32 } from '../data/palette.js';
import { sfx } from '../systems/sfx.js';
import { panel } from './pixel.js';
import { text } from './font.js';

// Pixel panel button: small key hint top-left, label, and a dim sub-line.
// Disabled buttons still receive clicks (they buzz, and call onDeny) so players get feedback.
// cost: energy pips drawn in the top-right corner.
export class Button {
  constructor(scene, x, y, w, h, { key = '', label = '', sub = '', onClick = () => {}, onDeny = null, cost = 0, depth = 11 } = {}) {
    Object.assign(this, { scene, x, y, w, h, onClick, onDeny, cost });
    this.enabled = true;
    this.hover = false;
    this.down = false;
    this.g = scene.add.graphics().setDepth(depth);
    const cx = x + Math.floor(w / 2);
    this.keyText = text(scene, x + 3, y + 3, key, { color: COLORS.textDim, shadow: false }).setDepth(depth + 1);
    // Text rows for tall / compact buttons, leaving clear space above the dark bottom edge.
    const ly = h >= 32 ? 11 : 3, sy = h >= 32 ? 21 : 13;
    const lyy = sub ? ly : Math.floor((h - 8) / 2); // a label with no sub-line sits in the middle
    this.label = text(scene, cx, y + lyy, label, { origin: [0.5, 0] }).setDepth(depth + 1);
    this.sub = text(scene, cx, y + sy, sub, { origin: [0.5, 0], color: COLORS.textDim, shadow: false }).setDepth(depth + 1);
    // Depth matters for input: Phaser only hits the top-most interactive object.
    this.zone = scene.add.zone(x, y, w, h).setOrigin(0).setDepth(depth + 1).setInteractive({ useHandCursor: true });
    this.zone.on('pointerover', () => { this.hover = true; this.draw(); });
    this.zone.on('pointerout', () => { this.hover = false; this.draw(); });
    this.zone.on('pointerdown', () => this.click());
    // Touch has no pointerout, so drop the hover highlight after a tap.
    this.zone.on('pointerup', (p) => { if (p.wasTouch) { this.hover = false; this.draw(); } });
    this.draw();
  }

  click() {
    if (!this.enabled) { sfx('deny'); this.onDeny?.(); return; }
    sfx('blip');
    this.down = true;
    this.draw();
    this.scene.time.delayedCall(90, () => { this.down = false; this.draw(); });
    this.onClick();
  }

  setEnabled(on) { this.enabled = on; this.draw(); return this; }

  setText(label, sub) {
    if (label != null) this.label.setText(label);
    if (sub != null) this.sub.setText(sub);
    return this;
  }

  destroy() {
    for (const o of [this.g, this.keyText, this.label, this.sub, this.zone]) o.destroy();
  }

  draw() {
    if (!this.g.scene) return; // destroyed (e.g. a list redrawn by its own click)
    const live = this.enabled, d = this.down ? 1 : 0;
    const fill = live ? (this.hover ? E32.slate : E32.dusk) : E32.night;
    this.g.clear();
    panel(this.g, this.x, this.y + d, this.w, this.h - d, { fill, hi: live ? (this.hover ? E32.steel : E32.slate) : E32.dusk, rivets: false });
    for (let i = 0; i < this.cost; i++) {
      const px = this.x + this.w - 5 - i * 5, py = this.y + 3 + d;
      this.g.fillStyle(0x0c0e12).fillRect(px - 1, py - 1, 5, 5);
      this.g.fillStyle(live ? 0xfff096 : 0x6a6a50).fillRect(px, py, 3, 3);
    }
    this.label.setAlpha(live || this.down ? 1 : 0.45);
  }
}
