import { PAL, toEndesga } from '../data/palette.js';

const warned = new Set();

export function gridSize(grid) {
  return { w: Math.max(...grid.map((r) => r.length)), h: grid.length };
}

// Draw a grid onto a 2D context at (ox, oy). colorOf(ch, x, y) -> css color | null.
export function drawGrid(ctx, grid, ox = 0, oy = 0, colorOf = (ch) => PAL[ch]) {
  for (let y = 0; y < grid.length; y++) {
    const row = grid[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.') continue;
      if (!(ch in PAL) && !warned.has(ch)) {
        warned.add(ch);
        console.warn(`renderSprite: unknown palette key "${ch}"`);
      }
      const color = toEndesga(colorOf(ch, x, y)); // every pixel lands on Endesga 32
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(ox + x, oy + y, 1, 1);
    }
  }
}

// Render a grid into a new Phaser canvas texture (replaces any existing key).
export function makeTexture(scene, key, grid, colorOf) {
  const { w, h } = gridSize(grid);
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, w, h);
  drawGrid(tex.getContext(), grid, 0, 0, colorOf);
  tex.refresh();
  return tex;
}

// Hit-flash variant: outline stays, every other pixel goes white.
export const flashColor = (ch) => (ch === 'O' ? PAL.O : '#ffffff');

// Build the normal + "_flash" textures for one grid.
export function makeSpriteSet(scene, key, grid, colorOf) {
  makeTexture(scene, key, grid, colorOf);
  makeTexture(scene, `${key}_flash`, grid, flashColor);
}
