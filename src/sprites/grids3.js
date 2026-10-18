import { shapeGrid } from './shapes.js';

// Tidal Coast species (v2.2), built with the shape builder (sprites/shapes.js). All face RIGHT.

// Dilophosaurus: slim and quick, twin crests, a neck frill folded flat.
export const DILO = shapeGrid(29, 24, (g) => {
  g.line(9, 13, 0, 8, '7', 3, 1);                 // tail
  g.ellipse(13.5, 12.5, 5.5, 4, '7');             // body
  g.line(17, 11, 21, 6, '7', 3, 2);               // neck
  g.ellipse(22.5, 5, 2.6, 2, '7');                // head
  g.line(24, 5.5, 27.5, 6.5, '7', 2, 1);          // snout
  g.line(20, 2.5, 23, 0, '9', 1); g.line(22, 3, 25, 1, '9', 1); // twin crests
  g.line(18, 13, 20, 15, '8', 1);                 // arm
  g.shadeBottom('7', 'L', 1, 9, 19);              // belly
  g.line(11, 16, 10, 21, '8', 2); g.line(10, 21, 12, 23, '8', 2); // back leg
  g.line(16, 16, 17, 21, '7', 2); g.line(17, 21, 19, 23, '7', 2); // front leg
  for (const [x, y] of [[4, 9], [7, 10], [10, 9], [13, 9], [16, 9]]) { g.px(x, y, '8'); g.px(x, y + 1, '8'); } // stripes
  g.px(19, 8, '0'); g.px(20, 9, '0'); g.px(19, 9, '0'); // folded frill
  g.px(23, 4, 'E');
  g.px(26, 7, 'W');
}, { margin: 1 });

// Therizinosaurus: pot-bellied and tall, a small head on a long neck, giant claws.
export const THERI = shapeGrid(32, 30, (g) => {
  g.line(8, 17, 0, 19, '(', 4, 1);                // short feathered tail
  g.ellipse(14, 16.5, 7, 7, '(');                 // pot belly
  g.line(17, 11, 21, 4, '(', 3, 2);               // neck
  g.ellipse(22.5, 3.5, 2.4, 1.8, '(');            // head
  g.line(24, 4, 26.5, 5, '(', 1);                 // beak
  g.line(18, 13, 23, 16, ')', 2);                 // arm
  g.line(23, 15, 30, 17, 'W', 1); g.line(23, 17, 30, 21, 'W', 1); g.line(22, 18, 26, 24, 'W', 1); // scythe claws
  g.shadeBottom('(', 'L', 3, 10, 18);             // belly
  g.rect(10, 22, 3, 7, ')'); g.rect(16, 22, 3, 7, '('); // legs
  g.rect(9, 28, 5, 1, ')'); g.rect(15, 28, 5, 1, '('); // feet
  for (const x of [7, 9, 11, 13, 15]) g.px(x, 9 + Math.abs(11 - x) * 0.3, ')'); // feather fringe
  g.px(23, 3, 'E');
}, { margin: 1 });

// Plesiosaur: a round body on flippers, a long neck curving up to a small head.
export const PLESIO = shapeGrid(40, 20, (g) => {
  g.line(8, 13, 0, 15, '+', 3, 1);                // tail
  g.tri(10, 15, 4, 19, 14, 16, '=');              // back flipper
  g.tri(19, 15, 16, 19, 24, 16, '=');             // front flipper
  g.ellipse(15, 12.5, 8, 4, '+');                 // body
  g.line(21, 11, 28, 4, '+', 3, 2);               // neck
  g.line(28, 4, 31, 3, '+', 2);
  g.ellipse(32.5, 3, 2.5, 1.8, '+');              // head
  g.line(34, 3.5, 38, 4, '+', 2, 1);              // snout
  g.shadeBottom('+', '-', 1, 8, 23);
  g.shadeTop('+', '=', 1, 9, 21);
  g.px(33, 2, 'E');
  g.px(36, 5, 'W'); g.px(34, 5, 'W');
}, { margin: 1 });

// Ichthyosaur: a fast dolphin-shaped swimmer with a long beak.
export const ICHTHY = shapeGrid(28, 14, (g) => {
  g.tri(5, 7, 0, 1, 3, 7, '*'); g.tri(5, 7, 0, 13, 3, 7, '*'); // tail fluke
  g.ellipse(13, 7, 8, 3.5, '*');                  // body
  g.tri(11, 4, 14, 0, 16, 4, '*');                // dorsal fin
  g.line(20, 7, 27, 8, '*', 2, 1);                // beak
  g.tri(14, 9, 11, 13, 17, 10, '~');              // flipper
  g.shadeBottom('*', 'V', 1, 6, 22);
  g.shadeTop('*', '~', 1, 4, 10);
  g.px(19, 6, 'E');
  g.px(24, 9, 'W');
}, { margin: 1 });

// Baryonyx: a long crocodile snout, a low body and a huge thumb claw.
export const BARY = shapeGrid(36, 24, (g) => {
  g.line(10, 12, 0, 8, '&', 4, 1);                // tail
  g.line(12, 15, 11, 22, '%', 3); g.rect(10, 22, 4, 1, '%'); // back leg
  g.line(18, 15, 19, 22, '&', 3); g.rect(18, 22, 4, 1, '&'); // front leg
  g.ellipse(15, 12, 7, 4.5, '&');                 // body
  g.line(20, 10, 24, 7, '&', 3);                  // neck
  g.ellipse(26, 6.5, 3, 2, '&');                  // head
  g.line(27, 7, 34.5, 8.5, '&', 2, 1);            // long snout
  g.line(21, 13, 24, 16, '&', 2);                 // arm
  g.line(24, 16, 27, 19, 'W', 1); g.px(25, 15, 'W'); g.px(26, 16, 'W'); // thumb claw
  g.shadeBottom('&', 'h', 2, 9, 21);
  for (const x of [9, 12, 15, 18]) g.px(x, 7, '%'); // back scutes
  g.px(26, 5, 'E');
  g.px(31, 9, 'W'); g.px(33, 9, 'W');
}, { margin: 1 });

// Abyss Mosasaur: the biggest thing in the game. A paddle-finned sea lizard with a
// shark-like tail and a jaw full of teeth; its eye glows.
export const MOSA = shapeGrid(56, 24, (g) => {
  g.line(16, 12, 3, 15, '@', 6, 2);               // tail
  g.tri(4, 15, 0, 7, 2, 15, '@'); g.tri(4, 15, 0, 22, 2, 15, '@'); // tail fin
  g.tri(17, 16, 11, 23, 22, 18, '!');             // back paddle
  g.tri(30, 16, 27, 23, 35, 17, '!');             // front paddle
  g.ellipse(24, 12, 11, 6, '@');                  // body
  g.line(33, 11, 42, 9, '@', 7, 6);               // neck
  g.ellipse(45, 8.5, 6, 4, '@');                  // head
  g.line(46, 7.5, 55, 9.5, '@', 3, 2);            // upper jaw
  g.line(45, 11.5, 53, 12.5, '@', 2, 1);          // lower jaw
  g.line(47, 10, 53, 11, 'M', 1);                 // mouth
  g.shadeBottom('@', '<', 2, 6, 46);
  g.shadeTop('@', '!', 1, 6, 44);
  for (const x of [47, 49, 51, 53]) g.px(x, 10, 'W'); // teeth
  for (const x of [48, 50, 52]) g.px(x, 11, 'W');
  for (const x of [18, 22, 26, 30]) g.px(x, 10, '!'); // scale ridges
  g.px(45, 6, '?'); g.px(46, 6, '?');             // glowing eye
}, { margin: 1 });

export const GRIDS3 = { dilo: DILO, theri: THERI, plesio: PLESIO, ichthy: ICHTHY, bary: BARY, mosa: MOSA };
// Row removed for the crouch frame (roughly the middle of the body).
export const CROUCH_DROP3 = { dilo: 12, theri: 15, plesio: 10, ichthy: 6, bary: 11, mosa: 11 };
