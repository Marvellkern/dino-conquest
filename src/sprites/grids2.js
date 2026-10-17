import { shapeGrid } from './shapes.js';
import { REX } from './grids.js';
import { buildForm } from './forms.js';

// v2 species, built with the shape builder (sprites/shapes.js). All face RIGHT.

// Ankylo: low and wide, studded armor, a heavy tail club.
export const ANKYLO = shapeGrid(36, 17, (g) => {
  g.line(9, 10, 2, 7, 'a', 2, 2);                // tail
  g.ellipse(2.5, 6.5, 2, 2, 'b');                 // club
  g.rect(9, 11, 4, 5, 'b'); g.rect(22, 11, 4, 5, 'b'); // legs
  g.ellipse(17, 8.5, 11, 4.5, 'a');               // body
  g.ellipse(30, 10, 4, 2.6, 'a');                 // head
  g.shadeBottom('a', 'h', 2, 8, 27);
  g.shadeTop('a', 'e', 1, 7, 27);
  for (const x of [9, 13, 17, 21, 25]) { g.px(x, 4, 'W'); g.px(x, 3, 'W'); }  // spikes
  for (const x of [11, 15, 19, 23]) g.px(x, 6, 'e');
  g.px(1, 4, 'W'); g.px(4, 4, 'W');              // club spikes
  g.px(32, 9, 'E');
  g.px(34, 11, 'W');
});

// Pteranodon: perched, one wing raised, long beak and swept-back crest.
export const PTERA = shapeGrid(36, 22, (g) => {
  g.tri(17, 11, 2, 1, 11, 15, 'l');               // raised wing
  g.line(17, 11, 2, 1, 'j', 1);                   // wing bone
  g.line(17, 16, 15, 20, 'j', 1); g.line(20, 16, 22, 20, 'j', 1); // legs
  g.ellipse(18.5, 13, 5, 3.6, 'i');               // body
  g.line(21, 11, 24, 8, 'i', 2);                  // neck
  g.ellipse(25.5, 7, 3, 2, 'i');                  // head
  g.tri(27, 6, 34.5, 8, 27, 8, 'F');              // beak
  g.line(23, 6, 18, 2, 'r', 2, 1);                // crest
  g.shadeBottom('i', 'j', 1, 14, 23);
  g.px(26, 6, 'E');
});

// Stego: arched back with big plates, small head, spiked tail.
export const STEGO = shapeGrid(37, 24, (g) => {
  g.line(8, 15, 2, 11, 'v', 3, 2);                // tail
  g.rect(10, 18, 4, 5, 'w'); g.rect(22, 18, 4, 5, 'w'); // legs
  g.ellipse(17, 14, 11, 5.5, 'v');                // body
  g.line(26, 15, 31, 17, 'v', 3);                 // neck
  g.ellipse(32.5, 17.5, 3, 2, 'v');               // head
  for (const [x, hgt] of [[9, 4], [13, 6], [17, 7], [21, 6], [25, 4]]) g.tri(x - 2, 10, x, 10 - hgt, x + 2, 10, 'x'); // plates
  g.shadeBottom('v', 'z', 2, 7, 28);
  g.line(2, 11, 0, 8, 'W', 1); g.line(4, 11, 4, 8, 'W', 1); // thagomizer
  g.px(33, 17, 'E');
});

// Carno: a T-Rex frame gone lean and red, with brow horns and longer legs.
export const CARNO = buildForm(REX, {
  pad: { top: 2 },
  rays: [{ x: 22, y: 1, dx: 0, dy: -1, len: 2, key: 'W' }, { x: 26, y: 1, dx: 1, dy: -1, len: 2, key: 'W' }],
  stretch: { rows: [20, 21] }
}).grid.map((r) => r.replaceAll('G', '1').replaceAll('D', '2').replaceAll('L', '3'));

// Dimetrodon (wildlife only): sprawling, with a tall spined sail.
export const DIMETRO = shapeGrid(34, 19, (g) => {
  g.line(8, 13, 1, 15, '4', 2, 1);                // tail
  g.ellipse(15, 11, 8, 8, 'f', { top: true });   // sail (its base hides behind the body)
  for (const x of [9, 12, 15, 18, 21]) g.line(x, 11, x, 4 + Math.abs(15 - x) * 0.7, 'g', 1);
  g.rect(9, 14, 3, 4, '5'); g.rect(20, 14, 3, 4, '5'); // legs
  g.ellipse(16, 13, 9, 2.8, '4');                 // body
  g.ellipse(28, 13, 4, 2.2, '4');                 // head
  g.shadeBottom('4', '6', 1, 8, 31);
  g.px(29, 12, 'E');
  g.px(31, 14, 'W'); g.px(29, 14, 'W');
});

export const GRIDS2 = { ankylo: ANKYLO, ptera: PTERA, stego: STEGO, carno: CARNO, dimetro: DIMETRO };
export const CROUCH_DROP2 = { ankylo: 7, ptera: 11, stego: 12, carno: 16, dimetro: 10 };

// Boss skins built from evolved forms with their own palette.
export const BOSS_SKINS = {
  cinderstego: { species: 'stego', base: STEGO, form: 0, colors: { v: '#3e2731', w: '#181425', x: '#feae34', z: '#be4a2f', E: '#fee761' } },
  titanrex: { species: 'rex', base: REX, form: 1, colors: { G: '#68386c', D: '#3e2731', L: '#b55088', E: '#2ce8f5', M: '#181425', W: '#c0cbdc' } }
};
