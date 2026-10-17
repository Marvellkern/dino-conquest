import { relicInfo } from '../run/run.js';
import { PERKS } from '../data/relics.js';

// A grid of owned fossil / perk icons. Tapping or hovering one calls
// onInfo(text) with its name and effect (shown in the scene's message line).
export class RelicBar {
  constructor(scene, x, y, { cols = 7, onInfo }) {
    Object.assign(this, { scene, x, y, cols, onInfo, items: [] });
  }

  set(ids) {
    for (const it of this.items) { it.img.destroy(); it.zone.destroy(); }
    this.items = ids.map((id, i) => {
      const px = this.x + (i % this.cols) * 9, py = this.y + Math.floor(i / this.cols) * 9;
      const img = this.scene.add.image(px, py, PERKS[id] ? 'relic_perk' : `relic_${id}`).setOrigin(0).setDepth(12);
      const zone = this.scene.add.zone(px - 1, py - 1, 10, 10).setOrigin(0).setDepth(13).setInteractive({ useHandCursor: true });
      const info = relicInfo(id);
      const show = () => this.onInfo(`${info.name.toUpperCase()}: ${info.desc}`);
      zone.on('pointerover', show);
      zone.on('pointerdown', show);
      return { id, img, zone };
    });
    return this;
  }
}
