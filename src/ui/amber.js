import { text } from './font.js';

// Amber, the currency. AMB is the amber glyph in both pixel fonts (drawn in
// place of '$'), for prices inside text: `${cost}${AMB}`. amberCount() is a
// right-aligned total with the full-color amber icon (sprites/icons.js) in front.
export const AMB = '$';

export function amberCount(scene, x, y, n, { color = '#e8a030', depth = 11, small = false } = {}) {
  const t = text(scene, x, y, String(n), { color, origin: [1, 0], small, shadow: !small }).setDepth(depth);
  const icon = scene.add.image(0, y + (small ? -2 : -1), 'icon_amber').setOrigin(1, 0).setDepth(depth);
  const o = {
    t, icon,
    set(v) {
      t.setText(String(v));
      icon.x = x - Math.ceil(t.label.width) - 2;
      return o;
    },
    setScrollFactor(f) { t.setScrollFactor(f); icon.setScrollFactor(f); return o; }
  };
  return o.set(n);
}
