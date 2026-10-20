import { W, H, COLORS, PORTRAIT } from '../config.js';
import { SPECIES } from '../data/species.js';
import { VARIANTS, VARIANT_ORDER } from '../data/variants.js';
import { skinOf } from '../run/run.js';
import { ensureSkin } from '../sprites/skinBuild.js';
import { panel } from './pixel.js';
import { text } from './font.js';
import { Button } from './button.js';
import { FocusNav } from './focus.js';

// Dino-dex variant page (gacha brief §5): one species at a time, its 6 color variants.
// Owned ones show in full with their perk; the rest are dark silhouettes. < > (or the
// arrow keys) flip species, BACK / Esc closes. owned(species) -> { variant: true }.
// Resolves when closed.
export function variantDex(scene, list, start, owned) {
  return new Promise((resolve) => {
    let i = Math.max(0, list.indexOf(start));
    const cols = PORTRAIT ? 2 : 3, cw = PORTRAIT ? 82 : 98, ch = PORTRAIT ? 70 : 60;
    const PW = cols * cw + 12, PH = 20 + Math.ceil(VARIANT_ORDER.length / cols) * ch + 30;
    const x = Math.round((W - PW) / 2), y = Math.max(2, Math.round((H - PH) / 2));
    const frame = [
      scene.add.rectangle(0, 0, W, H, 0x000000, 0.6).setOrigin(0).setDepth(60).setInteractive(),
      panel(scene.add.graphics().setDepth(61), x, y, PW, PH)
    ];
    let page = [];
    const draw = () => {
      for (const o of page) o.destroy();
      const sp = list[i], have = owned(sp), n = VARIANT_ORDER.filter((v) => have[v]).length;
      page = [text(scene, W / 2, y + 6, `${(SPECIES[sp].short ?? SPECIES[sp].name).toUpperCase()} VARIANTS  ${n}/6`, { color: COLORS.accent, origin: [0.5, 0] }).setDepth(62)];
      VARIANT_ORDER.forEach((v, k) => {
        const cx = x + 6 + (k % cols) * cw + cw / 2, top = y + 20 + Math.floor(k / cols) * ch, got = have[v], def = VARIANTS[v];
        const img = scene.add.image(cx, top + 22, ensureSkin(scene, skinOf(sp, 0, null, v))).setDepth(62);
        if (img.height > 34 || img.width > cw - 6) img.setScale(0.5); // halves stay pixel-exact
        if (!got) img.setTintFill(0x0c0e12);
        page.push(img,
          text(scene, cx, top + 40, got ? def.name : '???', { origin: [0.5, 0], color: got ? `#${def.glow.toString(16).padStart(6, '0')}` : COLORS.textDim, shadow: false }).setDepth(62),
          text(scene, cx, top + 49, got ? def.desc : `${def.weight}% OF FEATURED HITS`, { origin: [0.5, 0], color: COLORS.textDim, small: true }).setDepth(62));
      });
    };
    const by = y + PH - 24;
    const flip = (d) => { i = (i + d + list.length) % list.length; draw(); };
    const btns = [
      new Button(scene, x + 6, by, 30, 18, { label: '<', depth: 62, onClick: () => flip(-1) }).pin(),
      new Button(scene, x + PW - 36, by, 30, 18, { label: '>', depth: 62, onClick: () => flip(1) }).pin(),
      new Button(scene, Math.round(W / 2 - 30), by, 60, 18, { label: 'BACK', depth: 62, onClick: () => close() }).pin()
    ];
    const nav = new FocusNav(scene, { items: () => btns, show: true, modal: true, start: 2, onBack: () => close() });
    const onKey = (e) => {
      if (e.repeat || nav.handle(e)) return;
      if (e.code === 'KeyA') flip(-1);
      else if (e.code === 'KeyD') flip(1);
    };
    scene.input.keyboard.on('keydown', onKey);
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      scene.input.keyboard.off('keydown', onKey);
      nav.destroy();
      scene.time.delayedCall(80, () => { [...frame, ...page].forEach((o) => o.destroy()); btns.forEach((b) => b.destroy()); resolve(); });
    };
    for (const o of frame) o.setScrollFactor(0);
    draw();
  });
}
