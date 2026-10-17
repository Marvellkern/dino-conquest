// Egg (14x18). Palette: A shell, Z shade, X spots.
export const EGG = [
  '.....OOOO.....',
  '...OOAAAAOO...',
  '..OAAAAAAAAO..',
  '.OAAAXXAAAAAO.',
  '.OAAXXXAAAAAO.',
  'OAAAAXAAAAAAAO',
  'OAAAAAAAAXXAAO',
  'OAAAAAAAAXXAAO',
  'OAXXAAAAAAAAAO',
  'OAXXAAAAAAAAZO',
  'OAAAAAAXXAAAZO',
  'OAAAAAAXXAAAZO',
  'OZAAAAAAAAAZZO',
  '.OZAAXXAAAAZO.',
  '.OZZAXXAAAZZO.',
  '..OZZAAAAZZO..',
  '...OOZZZZOO...',
  '.....OOOO.....'
];

// Zigzag crack, revealed a few pixels per stage.
const CRACK = [[7, 3], [6, 4], [7, 5], [8, 6], [7, 7], [6, 8], [5, 8], [4, 9], [8, 7], [9, 8], [10, 9], [3, 10], [11, 10]];
const STAGE_LEN = [0, 4, 8, CRACK.length];

export function crackedEgg(stage) {
  const rows = EGG.map((r) => [...r]);
  for (const [x, y] of CRACK.slice(0, STAGE_LEN[stage])) rows[y][x] = 'O';
  return rows.map((r) => r.join(''));
}

export const EGG_STAGES = 3;
