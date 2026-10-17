import { COLORS } from '../config.js';
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
    const ly = h >= 32 ? 12 : 4, sy = h >= 32 ? 23 : 15; // text rows for tall / compact buttons
    this.label = text(scene, cx, y + ly, label, { origin: [0.5, 0] }).setDepth(depth + 1);
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
    const live = this.enabled, d = this.down ? 1 : 0;
    const fill = live ? (this.hover ? 0x3e4553 : 0x2e333d) : 0x1e2128;
    this.g.clear();
    panel(this.g, this.x, this.y + d, this.w, this.h - d, { fill, hi: live ? 0x5a6274 : 0x2a2e36 });
    for (let i = 0; i < this.cost; i++) {
      const px = this.x + this.w - 5 - i * 5, py = this.y + 3 + d;
      this.g.fillStyle(0x0c0e12).fillRect(px - 1, py - 1, 5, 5);
      this.g.fillStyle(live ? 0xfff096 : 0x6a6a50).fillRect(px, py, 3, 3);
    }
    this.label.setAlpha(live || this.down ? 1 : 0.45);
  }
}
