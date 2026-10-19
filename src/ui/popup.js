import { W, H, COLORS } from '../config.js';
import { panel } from './pixel.js';
import { text } from './font.js';
import { Button } from './button.js';
import { FocusNav } from './focus.js';
import { replaying, takeReplay, dropReplay, logPick } from '../systems/runStore.js';

const BACK_LABELS = /^(CANCEL|BACK|LEAVE|DONE|KEEP IT|LEAVE IT|NOT NOW)$/;

// Scenes whose popups are part of the saved run (recorded, replayed after a reload).
const RUN_SCENES = new Set(['Map', 'Battle', 'Evolution']);

// Modal choice box over a dimmed screen. options: [{ label, sub?, disabled? }]
// (disabled: a reason string; the option is greyed out and shows it).
// Resolves with the chosen index. Click/tap, keys 1–N, or arrows + Enter (Esc picks a
// CANCEL / BACK / LEAVE / DONE option if there is one). bh: button height.
export function choose(scene, { title, lines = [], options, bh = 32 }) {
  const inRun = RUN_SCENES.has(scene.scene.key);
  if (inRun && replaying()) { // a resumed run: answer as the player did before the reload
    const i = takeReplay();
    if (Number.isInteger(i) && options[i] && !options[i].disabled) return Promise.resolve(i);
    dropReplay(); // out of step: ask from here on
  }
  return new Promise((resolve) => {
    // Too many options for the screen (landscape is only 180 tall): shrink the buttons so the
    // popup fits, down to 18px (a label and a small sub-line still fit).
    const room = H - 4 - (20 + lines.length * 10 + 4 + 4);
    if (options.length * (bh + (bh < 32 ? 3 : 4)) > room) bh = Math.max(18, Math.floor(room / options.length) - 3);
    const PW = Math.min(236, W - 8), x = Math.round((W - PW) / 2), gap = bh < 32 ? 3 : 4;
    const ph = 20 + lines.length * 10 + 4 + options.length * (bh + gap) + 4;
    const y = Math.max(2, Math.round((H - ph) / 2));
    const objs = [
      scene.add.rectangle(0, 0, W, H, 0x000000, 0.55).setOrigin(0).setDepth(60).setInteractive(), // swallows clicks
      panel(scene.add.graphics().setDepth(61), x, y, PW, ph),
      text(scene, W / 2, y + 6, title, { color: COLORS.accent, origin: [0.5, 0] }).setDepth(62),
      // A line too wide for the panel (narrow portrait popups) drops to the small font.
      ...lines.map((l, i) => text(scene, W / 2, y + 19 + i * 10 + (String(l).length * 6 > PW - 8 ? 1 : 0), l, { origin: [0.5, 0], shadow: false, small: String(l).length * 6 > PW - 8 }).setDepth(62))
    ];
    for (const o of objs) o.setScrollFactor(0); // stay put on a scrolled camera (portrait map)
    const by = y + 20 + lines.length * 10 + 4;
    let picked = false;
    const done = (i) => {
      if (picked) return;
      picked = true;
      if (inRun) logPick(i);
      scene.input.keyboard.off('keydown', onKey);
      nav.destroy();
      scene.time.delayedCall(100, () => {
        objs.forEach((o) => o.destroy());
        btns.forEach((b) => b.destroy());
        resolve(i);
      });
    };
    const btns = options.map((o, i) => new Button(scene, x + 8, by + i * (bh + gap), PW - 16, bh, {
      key: options.length > 1 ? String(i + 1) : '', label: o.label, sub: o.disabled ?? o.sub ?? '', depth: 62, onClick: () => done(i)
    }).setEnabled(!o.disabled).pin());
    let back = -1; // the last usable CANCEL / BACK / LEAVE ... option
    options.forEach((o, i) => { if (!o.disabled && BACK_LABELS.test(o.label)) back = i; });
    const nav = new FocusNav(scene, {
      items: () => btns, show: true, modal: true, start: Math.max(0, options.findIndex((o) => !o.disabled)),
      onBack: back >= 0 ? () => btns[back].click() : null
    });
    const onKey = (e) => {
      if (e.repeat || nav.handle(e)) return;
      const i = '123456'.indexOf(e.key);
      if (i >= 0 && i < btns.length) btns[i].click();
    };
    scene.input.keyboard.on('keydown', onKey);
  });
}
