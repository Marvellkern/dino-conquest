import { hexToHsl, hslToHex, fossilColor } from './skins.js';

// Variant palettes (data/variants.js): each turns a skin's colors (any species, any form)
// into the variant's look. Pixels are snapped to Endesga 32 when drawn (renderSprite.js).
// base(ch, x, y): the skin's own color; the outline and teeth stay as they are.
const KEEP = new Set(['O', 'W']);
const tone = (hex, fn) => { const [h, s, l] = hexToHsl(hex); return hslToHex(...fn(h, s, l)); };

const LOOKS = {
  // white / pale skin with a faint pink, pink eyes
  albino: (c, ch) => (ch === 'E' ? '#e8606a' : tone(c, (h, s, l) => [350, 0.22, 0.64 + 0.34 * l])),
  // near-black body, bright amber eyes
  melanistic: (c, ch) => (ch === 'E' ? '#feae34' : tone(c, (h, s, l) => [h, s * 0.35, 0.07 + 0.2 * l])),
  // icy blue, a white belly (the light colors), pale eyes
  frost: (c, ch) => (ch === 'E' ? '#e8f8ff' : tone(c, (h, s, l) => (l > 0.62 ? [205, 0.3, 0.95] : [205, 0.55, 0.42 + 0.45 * l]))),
  // dark red-black with glowing orange cracks
  magma: (c, ch, x, y) => {
    if (ch === 'E') return '#feae34';
    if ((x * 3 + y * 5) % 13 === 0 || (x * 5 - y * 3 + 130) % 17 === 0) return (x + y) % 2 ? '#f77622' : '#feae34';
    return tone(c, (h, s, l) => [5, 0.55, 0.07 + 0.2 * l]);
  },
  // the bone cast (as the family-tree fossils), with dark gaps between the ribs
  fossil: (c, ch, x, y) => (ch !== 'E' && x % 3 === 0 && y % 4 !== 0 ? '#5d4a3a' : fossilColor(ch)),
  // gold with sparkle pixels
  golden: (c, ch, x, y) => {
    if (ch === 'E') return c;
    if ((x * 7 + y * 13) % 23 === 0) return '#ffffff';
    return tone(c, (h, s, l) => [45, 0.85, 0.3 + 0.55 * l]);
  }
};

export function variantColor(variant, base) {
  const look = LOOKS[variant];
  return (ch, x, y) => {
    const c = base(ch, x, y);
    if (!c || (KEEP.has(ch) && variant !== 'fossil')) return c;
    return look(c, ch, x, y);
  };
}
