import { COLORS } from '../config.js';
import { E32 } from '../data/palette.js';
import { sfx } from '../systems/sfx.js';
import { panel } from './pixel.js';
import { text } from './font.js';

// Pixel panel button: small key hint top-left, label, and a dim sub-line.
// Disabled buttons still receive clicks (they buzz, and call onDeny) so players get feedback.
// cost: energy pips drawn in the top-right corner. The sub-line and key hint
// use the small 3x5 font. textTop: push the text block down (room for an icon).
export class Button {
  constructor(scene, x, y, w, h, { key = '', label = '', sub = '', onClick = () => {}, onDeny = null, cost = 0, depth = 11, textTop = 0 } = {}) {
    Object.assign(this, { scene, x, y, w, h, onClick, onDeny, cost });
    this.enabled = true;
    this.hover = false;
    this.down = false;
    this.g = scene.add.graphics().setDepth(depth);
    const cx = x + Math.floor(w / 2);
    this.keyText = text(scene, x + 3, y + 3, key, { color: COLORS.textDim, small: true }).setDepth(depth + 1);
    // Label (7px) + gap + sub, centered as a block; a lone label is centered alone.
    // A sub-line too wide for the button wraps (portrait rows have room for two lines).
    this.textTop = textTop;
    this.label = text(scene, cx, y, label, { origin: [0.5, 0] }).setDepth(depth + 1);
    this.sub = text(scene, cx, y, sub, { origin: [0.5, 0], color: '#c0cbdc', small: true }).setDepth(depth + 1);
    this.sub.setMaxWidth(w - 8);
    this.sub.setCenterAlign?.();
    this.hasSub = !!sub;
    this.placeLabel();
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
    if (sub != null) { this.sub.setText(sub); this.hasSub = !!sub; this.placeLabel(); }
    return this;
  }

  // Lay out label + sub for the current text. (The label is a container whose
  // children were built at y, so moving the container moves both layers.)
  placeLabel() {
    const { h, textTop } = this, gap = h >= 32 ? 4 : 3;
    if (!this.hasSub) { this.label.y = Math.floor((h - 1 - 7) / 2) + textTop; return; }
    const subH = Math.max(5, Math.round(this.sub.height) - 1);
    const ly = Math.max(2, Math.floor((h - 1 - (7 + gap + subH)) / 2) + textTop);
    this.label.y = ly;
    this.sub.y = this.y + ly + 7 + gap;
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
