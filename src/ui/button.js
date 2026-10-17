import { COLORS } from '../config.js';
import { sfx } from '../systems/sfx.js';
import { panel } from './pixel.js';
import { text } from './font.js';

// Pixel panel button: small key hint top-left, label, and a dim sub-line.
// Disabled buttons still receive clicks (they buzz) so players get feedback.
export class Button {
  constructor(scene, x, y, w, h, { key = '', label = '', sub = '', onClick = () => {}, depth = 11 } = {}) {
    Object.assign(this, { scene, x, y, w, h, onClick });
    this.enabled = true;
    this.hover = false;
    this.down = false;
    this.g = scene.add.graphics().setDepth(depth);
    const cx = x + Math.floor(w / 2);
    this.keyText = text(scene, x + 3, y + 3, key, { color: COLORS.textDim, shadow: false }).setDepth(depth + 1);
    this.label = text(scene, cx, y + 12, label, { origin: [0.5, 0] }).setDepth(depth + 1);
    this.sub = text(scene, cx, y + 23, sub, { origin: [0.5, 0], color: COLORS.textDim, shadow: false }).setDepth(depth + 1);
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
    if (!this.enabled) { sfx('deny'); return; }
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
    this.label.setAlpha(live || this.down ? 1 : 0.45);
  }
}
