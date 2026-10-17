import { SMALL_KEY, buildSmallFont } from './fontSmall.js';

// Code-drawn 5x7 bitmap font, registered as a Phaser bitmap font ("px").
// Each glyph: 7 rows of 5 bits, space-separated. Lowercase maps to uppercase.
const GLYPHS = {
  A: '01110 10001 10001 11111 10001 10001 10001',
  B: '11110 10001 10001 11110 10001 10001 11110',
  C: '01110 10001 10000 10000 10000 10001 01110',
  D: '11110 10001 10001 10001 10001 10001 11110',
  E: '11111 10000 10000 11110 10000 10000 11111',
  F: '11111 10000 10000 11110 10000 10000 10000',
  G: '01110 10001 10000 10111 10001 10001 01111',
  H: '10001 10001 10001 11111 10001 10001 10001',
  I: '01110 00100 00100 00100 00100 00100 01110',
  J: '00111 00010 00010 00010 00010 10010 01100',
  K: '10001 10010 10100 11000 10100 10010 10001',
  L: '10000 10000 10000 10000 10000 10000 11111',
  M: '10001 11011 10101 10101 10001 10001 10001',
  N: '10001 10001 11001 10101 10011 10001 10001',
  O: '01110 10001 10001 10001 10001 10001 01110',
  P: '11110 10001 10001 11110 10000 10000 10000',
  Q: '01110 10001 10001 10001 10101 10010 01101',
  R: '11110 10001 10001 11110 10100 10010 10001',
  S: '01111 10000 10000 01110 00001 00001 11110',
  T: '11111 00100 00100 00100 00100 00100 00100',
  U: '10001 10001 10001 10001 10001 10001 01110',
  V: '10001 10001 10001 10001 10001 01010 00100',
  W: '10001 10001 10001 10101 10101 10101 01010',
  X: '10001 10001 01010 00100 01010 10001 10001',
  Y: '10001 10001 01010 00100 00100 00100 00100',
  Z: '11111 00001 00010 00100 01000 10000 11111',
  0: '01110 10001 10011 10101 11001 10001 01110',
  1: '00100 01100 00100 00100 00100 00100 01110',
  2: '01110 10001 00001 00010 00100 01000 11111',
  3: '11111 00010 00100 00010 00001 10001 01110',
  4: '00010 00110 01010 10010 11111 00010 00010',
  5: '11111 10000 11110 00001 00001 10001 01110',
  6: '00110 01000 10000 11110 10001 10001 01110',
  7: '11111 00001 00010 00100 01000 01000 01000',
  8: '01110 10001 10001 01110 10001 10001 01110',
  9: '01110 10001 10001 01111 00001 00010 01100',
  ' ': '00000 00000 00000 00000 00000 00000 00000',
  '.': '00000 00000 00000 00000 00000 01100 01100',
  ',': '00000 00000 00000 00000 01100 00100 01000',
  '!': '00100 00100 00100 00100 00100 00000 00100',
  '?': '01110 10001 00001 00010 00100 00000 00100',
  ':': '00000 01100 01100 00000 01100 01100 00000',
  '-': '00000 00000 00000 11111 00000 00000 00000',
  '+': '00000 00100 00100 11111 00100 00100 00000',
  '=': '00000 00000 11111 00000 11111 00000 00000',
  '/': '00001 00001 00010 00100 01000 10000 10000',
  '%': '11000 11001 00010 00100 01000 10011 00011',
  "'": '00100 00100 01000 00000 00000 00000 00000',
  '(': '00010 00100 01000 01000 01000 00100 00010',
  ')': '01000 00100 00010 00010 00010 00100 01000',
  '#': '01010 01010 11111 01010 11111 01010 01010',
  '*': '00000 00100 10101 01110 10101 00100 00000',
  '>': '01000 00100 00010 00001 00010 00100 01000',
  '<': '00010 00100 01000 10000 01000 00100 00010'
};

export const FONT_KEY = 'px';
export { SMALL_CW } from './fontSmall.js';
const CW = 6; // cell width (5 + 1 spacing)
const CH = 8; // cell height (7 + 1 gap)

export function buildFont(scene) {
  const chars = Object.keys(GLYPHS).join('');
  const perRow = 16;
  const rows = Math.ceil(chars.length / perRow);
  const tex = scene.textures.createCanvas(FONT_KEY, perRow * CW, rows * CH);
  const ctx = tex.getContext();
  ctx.fillStyle = '#ffffff';
  [...chars].forEach((c, i) => {
    const ox = (i % perRow) * CW;
    const oy = Math.floor(i / perRow) * CH;
    GLYPHS[c].split(' ').forEach((bits, y) => {
      for (let x = 0; x < 5; x++) if (bits[x] === '1') ctx.fillRect(ox + x, oy + y, 1, 1);
    });
  });
  tex.refresh();
  const entry = Phaser.GameObjects.RetroFont.Parse(scene, {
    image: FONT_KEY, width: CW, height: CH, chars, charsPerRow: perRow,
    spacing: { x: 0, y: 0 }, offset: { x: 0, y: 0 }, lineSpacing: 2
  });
  scene.cache.bitmapFont.add(FONT_KEY, entry);
  buildSmallFont(scene);
}

// Text helper. Integer scale only, so glyph pixels stay square.
// origin: number or [ox, oy]. With shadow (default) returns a container whose
// setText updates both layers; `.label` is the foreground text.
// small: the 3x5 font (ui/fontSmall.js) for secondary lines; never shadowed.
export function text(scene, x, y, str, { scale = 1, color = '#f0ecdc', origin = 0, shadow = true, small = false } = {}) {
  const up = (v) => String(v).toUpperCase();
  const tint = parseInt(color.slice(1), 16);
  const key = small ? SMALL_KEY : FONT_KEY;
  if (small) shadow = false;
  const make = (dx, dy, t) =>
    scene.add.bitmapText(x + dx, y + dy, key, up(str)).setScale(scale).setOrigin(...[origin].flat()).setTint(t);
  if (!shadow) {
    const t = make(0, 0, tint);
    const set = t.setText.bind(t);
    t.setText = (v) => set(up(v)); // font is caps-only
    t.label = t;
    return t;
  }
  // Titles (scale 2+): 2px dark drop shadow plus a 1px light highlight on top.
  const title = scale >= 2;
  const sh = make(title ? 2 : 1, title ? 2 : 1, 0x181425);
  const layers = [sh];
  if (title) layers.push(make(0, -1, lighten(tint)));
  const fg = make(0, 0, tint);
  layers.push(fg);
  const c = scene.add.container(0, 0, layers);
  c.label = fg;
  c.setText = (v) => { for (const l of layers) l.setText(up(v)); return c; };
  return c;
}

// Halfway to white (title highlight).
function lighten(c) {
  const r = c >> 16, g = (c >> 8) & 255, b = c & 255, m = (v) => Math.round(v + (255 - v) * 0.55);
  return (m(r) << 16) | (m(g) << 8) | m(b);
}
