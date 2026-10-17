import { sfx } from '../systems/sfx.js';

// Slot-machine reel: a masked window that scrolls a vertical strip of items
// and lands on the last one. renderItem(item, y) returns game objects laid
// out for a cell whose top is at local y (cell is w x h).
export class Reel {
  constructor(scene, x, y, w, h, renderItem) {
    Object.assign(this, { scene, x, y, w, h, renderItem });
    this.frame = scene.add.graphics().setDepth(11);
    this.setBorder(0x0c0e12);
    this.strip = scene.add.container(x, y).setDepth(12);
    const mg = scene.make.graphics({ add: false });
    mg.fillStyle(0xffffff).fillRect(x, y, w, h);
    this.strip.setMask(mg.createGeometryMask());
  }

  // color: rarity border; a lit border also gets a soft outer glow.
  setBorder(color) {
    const { x, y, w, h } = this;
    this.frame.clear();
    if (color !== 0x0c0e12) {
      this.frame.fillStyle(color, 0.25).fillRect(x - 4, y - 4, w + 8, h + 8);
      this.frame.fillStyle(color, 0.45).fillRect(x - 3, y - 3, w + 6, h + 6);
    }
    this.frame.fillStyle(color).fillRect(x - 2, y - 2, w + 4, h + 4);
    this.frame.fillStyle(0x0c0e12).fillRect(x - 1, y - 1, w + 2, h + 2);
    this.frame.fillStyle(0x121418).fillRect(x, y, w, h);
  }

  fill(items) {
    this.strip.removeAll(true);
    items.forEach((it, k) => this.strip.add([].concat(this.renderItem(it, k * this.h))));
  }

  show(item) {
    this.fill([item]);
    this.strip.y = this.y;
  }

  // Spin through `items` (the last one is the result). Resolves on landing.
  spin(items, ms = 1500) {
    this.setBorder(0x0c0e12);
    this.fill([...items, items[0]]); // spare cell below the result for the overshoot
    this.strip.y = this.y;
    const end = this.endY = this.y - (items.length - 1) * this.h;
    let last = 0;
    return new Promise((resolve) => (this.tw = this.scene.tweens.add({
      targets: this.strip, y: end, duration: ms, ease: 'Back.Out', easeParams: [1.1],
      onUpdate: () => {
        const k = Math.floor((this.y - this.strip.y) / this.h + 0.5);
        if (k !== last) { last = k; sfx('tick'); }
      },
      onComplete: () => { this.tw = null; sfx('ding'); resolve(); }
    })));
  }

  // Tap to skip: land on the result right away.
  skip() {
    if (!this.tw?.isPlaying()) return;
    this.tw.complete(); // completing does not seek, so snap to the result cell
    this.strip.y = this.endY;
  }
}
