import { W, H, COLORS } from '../config.js';
import { panel } from './pixel.js';
import { text } from './font.js';
import { Button } from './button.js';

// Modal choice box over a dimmed screen. options: [{ label, sub? }].
// Resolves with the chosen index. Click/tap or keys 1–N.
export function choose(scene, { title, lines = [], options }) {
  return new Promise((resolve) => {
    const PW = 236, x = (W - PW) / 2, bh = 32, gap = 4;
    const ph = 20 + lines.length * 10 + 4 + options.length * (bh + gap) + 4;
    const y = Math.max(2, Math.round((H - ph) / 2));
    const objs = [
      scene.add.rectangle(0, 0, W, H, 0x000000, 0.55).setOrigin(0).setDepth(60).setInteractive(), // swallows clicks
      panel(scene.add.graphics().setDepth(61), x, y, PW, ph),
      text(scene, W / 2, y + 6, title, { color: COLORS.accent, origin: [0.5, 0] }).setDepth(62),
      ...lines.map((l, i) => text(scene, W / 2, y + 19 + i * 10, l, { origin: [0.5, 0], shadow: false }).setDepth(62))
    ];
    const by = y + 20 + lines.length * 10 + 4;
    let picked = false;
    const done = (i) => {
      if (picked) return;
      picked = true;
      scene.input.keyboard.off('keydown', onKey);
      scene.time.delayedCall(100, () => {
        objs.forEach((o) => o.destroy());
        btns.forEach((b) => b.destroy());
        resolve(i);
      });
    };
    const btns = options.map((o, i) => new Button(scene, x + 8, by + i * (bh + gap), PW - 16, bh, {
      key: options.length > 1 ? String(i + 1) : '', label: o.label, sub: o.sub ?? '', depth: 62, onClick: () => done(i)
    }));
    const onKey = (e) => {
      if (e.repeat) return;
      const i = options.length === 1 && (e.code === 'Space' || e.code === 'Enter') ? 0 : '123456'.indexOf(e.key);
      if (i >= 0 && i < btns.length) btns[i].click();
    };
    scene.input.keyboard.on('keydown', onKey);
  });
}
