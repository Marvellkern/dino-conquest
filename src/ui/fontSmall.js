// Code-drawn 3x5 bitmap font ("pxs") for secondary lines: button sub-text,
// descriptions, captions. Each glyph: 5 rows of 3 bits, space-separated.
export const SMALL_KEY = 'pxs';
export const SMALL_CW = 4; // cell width (3 + 1 spacing)
const CH = 6;

const GLYPHS = {
  A: '010 101 111 101 101', B: '110 101 110 101 110', C: '011 100 100 100 011', D: '110 101 101 101 110',
  E: '111 100 110 100 111', F: '111 100 110 100 100', G: '011 100 101 101 011', H: '101 101 111 101 101',
  I: '111 010 010 010 111', J: '001 001 001 101 010', K: '101 101 110 101 101', L: '100 100 100 100 111',
  M: '101 111 111 101 101', N: '110 101 101 101 101', O: '010 101 101 101 010', P: '110 101 110 100 100',
  Q: '010 101 101 110 011', R: '110 101 110 101 101', S: '011 100 010 001 110', T: '111 010 010 010 010',
  U: '101 101 101 101 111', V: '101 101 101 101 010', W: '101 101 111 111 101', X: '101 101 010 101 101',
  Y: '101 101 010 010 010', Z: '111 001 010 100 111',
  0: '111 101 101 101 111', 1: '010 110 010 010 111', 2: '110 001 010 100 111', 3: '110 001 010 001 110',
  4: '101 101 111 001 001', 5: '111 100 110 001 110', 6: '011 100 111 101 111', 7: '111 001 010 010 010',
  8: '111 101 111 101 111', 9: '111 101 111 001 110',
  ' ': '000 000 000 000 000', '.': '000 000 000 000 010', '·': '000 000 010 000 000', ',': '000 000 000 010 100', '!': '010 010 010 000 010',
  '?': '110 001 010 000 010', ':': '000 010 000 010 000', '-': '000 000 111 000 000', '+': '000 010 111 010 000',
  '=': '000 111 000 111 000', '/': '001 001 010 100 100', '%': '101 001 010 100 101', '(': '010 100 100 100 010',
  ')': '010 001 001 001 010', '#': '101 111 101 111 101', '*': '000 101 010 101 000', '>': '100 010 001 010 100',
  '<': '001 010 100 010 001', "'": '010 010 000 000 000',
  $: '010 101 111 111 010' // amber (see ui/amber.js)
};

export function buildSmallFont(scene) {
  const chars = Object.keys(GLYPHS).join(''), perRow = 16;
  const tex = scene.textures.createCanvas(SMALL_KEY, perRow * SMALL_CW, Math.ceil(chars.length / perRow) * CH);
  const ctx = tex.getContext();
  ctx.fillStyle = '#ffffff';
  [...chars].forEach((c, i) => {
    const ox = (i % perRow) * SMALL_CW, oy = Math.floor(i / perRow) * CH;
    GLYPHS[c].split(' ').forEach((bits, y) => {
      for (let x = 0; x < 3; x++) if (bits[x] === '1') ctx.fillRect(ox + x, oy + y, 1, 1);
    });
  });
  tex.refresh();
  scene.cache.bitmapFont.add(SMALL_KEY, Phaser.GameObjects.RetroFont.Parse(scene, {
    image: SMALL_KEY, width: SMALL_CW, height: CH, chars, charsPerRow: perRow,
    spacing: { x: 0, y: 0 }, offset: { x: 0, y: 0 }, lineSpacing: 1
  }));
}
