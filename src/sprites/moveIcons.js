// 8x8 move-button icons (palette keys from data/palette.js).
// Base moves by move id; the special shows the player's species head.
export const MOVE_ICONS = {
  bite: [
    '..OOOO..',
    '.OWWWWO.',
    'OWWWWWWO',
    'OWWWWWWO',
    '.OWWWWO.',
    '.OWOOWO.',
    '..O..O..',
    '........'
  ],
  tail: [
    '......OO',
    '.....OGO',
    '....OGO.',
    'OOOOGGO.',
    'OGGGGO..',
    '.OGGO...',
    '..OO....',
    '........'
  ],
  roar: [
    '.S...S..',
    'S.S...S.',
    'S..S...S',
    'S..S...S',
    'S..S...S',
    'S.S...S.',
    '.S...S..',
    '........'
  ],
  brace: [
    'OOOOOOOO',
    'OVVVVVVO',
    'OVTTTTVO',
    'OVTTTTVO',
    '.OVTTVO.',
    '.OVTTVO.',
    '..OVVO..',
    '...OO...'
  ],
  end: [
    'OOOOOOO.',
    '.OSSSO..',
    '..OSO...',
    '...O....',
    '..OSO...',
    '.OSSSO..',
    'OOOOOOO.',
    '........'
  ]
};

// Species head: one template, recolored (b = body, l = belly), plus a top accent.
const HEAD = [
  '........',
  '..OOOO..',
  '.ObbbbO.',
  'ObbEbbbO',
  'ObbbbbOO',
  'ObllWWO.',
  '.OllOO..',
  '..OO....'
];
const SPECIES_HEAD = {
  rex: ['G', 'L', null], raptor: ['R', 'C', null], compy: ['Y', 'N', null], trike: ['T', 'V', 'F'],
  pachy: ['p', 'n', 'd'], sarco: ['c', 'y', null], spino: ['s', 'u', 'f'],
  ankylo: ['a', 'h', 'e'], ptera: ['i', 'j', 'r'], stego: ['v', 'z', 'x'], carno: ['1', '3', 'W'],
  dilo: ['7', 'L', '9'], theri: ['(', 'L', ')'],
  ichthy: ['*', 'V', null], plesio: ['+', '-', null], bary: ['&', 'h', '%'], mosa: ['@', '<', '?']
};

export function speciesIcon(species) {
  const [b, l, accent] = SPECIES_HEAD[species] ?? SPECIES_HEAD.rex;
  const rows = HEAD.map((r) => r.replaceAll('b', b).replaceAll('l', l));
  if (accent) rows[0] = `..${accent.repeat(4)}..`; // crest / frill / dome / sail
  return rows;
}
export const ICON_SPECIES = Object.keys(SPECIES_HEAD);
