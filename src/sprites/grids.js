// Every dino is a character grid. Each char is a key in PAL (data/palette.js).
// All grids face RIGHT. Enemies are mirrored at render time.

export const REX = [
  '..................OOOOOOOOOO....',
  '.................OGGGGGGGGGGO...',
  '................OGGGGGGGGOOGGO..',
  '................OGGGGGGGGOEGGGO.',
  '................OGGGGGGGGGGGGGGO',
  '................ODGGGGGGGGGGGGGO',
  '................ODGGGGGOWOWOWOWO',
  '...............ODGGGGGOOOOOOOOO.',
  '...............OGGGGGLLWOWOWO...',
  '..............ODGGGGGLLOOOOO....',
  '............OODGGGGGGLLO........',
  '..........OODGGGGGGGGLLLOO......',
  '........OODDGGGGGGGGGLLLOGO.....',
  '......OODDGGGGGGGGGGGLLLOGGO....',
  '....OODDGGGGGGGGGGGGGLLLLOOGO...',
  '..OODDGGGGGGGGGGGGGGGLLLLO.O....',
  'OODDDGGGGGGGGGGGGGGGLLLLO.......',
  'OOOOODDGGGGGGGGGGGGLLLLO........',
  '.....OOOODDGGGGGGGGGLLO.........',
  '.........OODGGGGOODGGGO.........',
  '..........ODGGGO.ODGGGO.........',
  '..........ODGGO..ODGGO..........',
  '..........ODGGO...ODGGO.........',
  '.........ODGGGO...ODGGGO........',
  '........OGGOGGO..OGGOGGO........',
  '........OOOOOOO..OOOOOOO........'
];

export const RAPTOR = [
  '.................OOOOO...',
  '................ORRRRRO..',
  '...............ORRROERRO.',
  '...............ORRRRRRRRO',
  '..............ORRRRWOWOWO',
  '..............ORRRROOOOO.',
  '.............ORRRCO......',
  '............ORRRRCO......',
  'OOO........ORKRRKCCO.....',
  'ORROOO...OORKRRKRCCO.....',
  '.OBRRROOORRKRRKRRCCO.....',
  '..OOBBRRRRRRRRRRCCOOO....',
  '....OOOBBRRRRRRRCCOCRO...',
  '.......OOBBRRRRRCO.OWO...',
  '.........OOBRRORRO..O....',
  '..........OBRO.ORRO......',
  '..........ORO..OBRO......',
  '.........ORRO..ORRO......',
  '.........OWOO.OWORO......',
  '........OOOO..OOOOO......'
];

// Compy — small (20x16). Palette: Y olive, H shade, N belly, Q stripe.
export const COMPY = [
  '..............OOOO..',
  '.............OYYYYO.',
  '.............OYYYEYO',
  '.............OHYYYYO',
  '............OHYYWOWO',
  '............OHYOOOO.',
  'OOO........OHYNO....',
  'OYYOO....OOHYYNO....',
  '.OHYYOOOOYQYQYNO....',
  '..OOHHYYYYYYYNNOO...',
  '....OOOHHYYYYNOWO...',
  '.......OOHYOHYO.O...',
  '........OHO.OYO.....',
  '........OYO.OHYO....',
  '.......OWO..OWOO....',
  '.......OO...OOO.....'
];

// Triceratops — large, long and low (34x22). Palette: T slate, U shade, V belly, F frill rim.
export const TRIKE = [
  '..................OOOO............',
  '................OOFFFFOO..........',
  '...............OFFTTTTFO.......O..',
  '..............OFTTTTTTTFO.....OWO.',
  '.............OFTTTTTTTTTO....OWO..',
  '.............OFTTTTTTTTTTO.OOWO...',
  '......OOOOOOOFTTTTTTTTTTTOOTWOO...',
  '....OOTTTTTTFTTTTTTTTTTOTTTTTTOO..',
  '...OTTTTTTTTFTTTTTTTTTOTTTOETTTWO.',
  '..OTTTTTTTTTTFTTTTTTTUOTTTTTTTTOWO',
  '.OTTTTTTTTTTTFUTTTTTUOTTTTTTTTTOO.',
  'OTTTTTTTTTTTTTFUUUUUOUTTTTTTOOOO..',
  'OOUTTTTTTTTTTTTOOOOOUUTTTTTOUUUO..',
  '.OOUUTTTTTTTTTTTTTTUUUUTTTOUUUO...',
  '...OOUUVVVVVVVVVVVVVVUUUUOOOOO....',
  '.....OUUVVVVVVVVVVVVVUUUO.........',
  '.....OUUUOOOUUUUOOOOUUUUO.........',
  '.....OUUUO.OUUUO..OUUUUO..........',
  '.....OTTUO.OTTUO..OTTTUO..........',
  '.....OTTUO.OTTUO..OTTTUO..........',
  '....OWOWUO.OWOWO..OWOWUO..........',
  '....OOOOOO.OOOOO..OOOOOO..........'
];

// Pachycephalosaurus — dome-headed (24x20). Palette: p tan, q shade, n belly, d bone dome.
export const PACHY = [
  '.............OOOOO......',
  '...........OOdddddOO....',
  '..........OdddddddddO...',
  '.........OWddddddddddO..',
  '.........OpdddddddddpO..',
  '.........OpppppppOEpppO.',
  '.........OqppppppppppppO',
  '..........OqppppppOOOOO.',
  '.........OqppppnO.......',
  'OO......OqpppppnnO......',
  'OpOO...OqppppppnnO......',
  '.OqpOOOqpppppppnnnOO....',
  '..OqqppppppppppnnOpO....',
  '...OOqqpppppppnnO.OWO...',
  '.....OOqqppppnnO...O....',
  '.......OOqpOqppO........',
  '........OqO.OqpO........',
  '........OpO.OqpO........',
  '.......OWO..OWWO........',
  '.......OO...OOOO........'
];

// Sarcosuchus — low, long swamp croc (32x13). Palette: c green, k shade, y belly.
export const SARCO = [
  '.......................OOO......',
  '......................OcEcO.....',
  '..........OOOOOOOOOOOOcccccOOOOO',
  '.....OOOOOkckckckckckccccccccccO',
  'OOOOkcccccccccccccccccccWcWcWcWO',
  'OkkkccccccccccccccccOOOOOOOOOOO.',
  '.OOkkcccccccccccyyyyyWcWcWcWcO..',
  '...OOkkcccccyyyyyyyyyOOOOOOOO...',
  '.....OOkkkcccyyyyyyyyO..........',
  '......OkkO..OOOOOOOkcO..........',
  '.....OkcO..........OkkO.........',
  '....OWWOO.........OWWWO.........',
  '....OOOO..........OOOOO.........'
];

// Spinosaurus — swamp boss with a sail (37x25). Palette: s teal, t shade, u belly, f sail, g spines.
export const SPINO = [
  '.........OOOOOO......................',
  '.......OOfgfgffOO....................',
  '......OfffgffgfffO...................',
  '.....OffgffgffgfffO..................',
  '....OfffgffgffgffgfO.................',
  '....OffgffgffgffgffO.......OOOO......',
  '...OfffgffgffgffgfffO....OOssssOOO...',
  '...OffgffgffgffgffgfO...OsssssEssOOO.',
  '..OfffgffgffgffgffgffO.OssssssssssssO',
  '..OOtttttttttttttttttOOssssssOWOWOWOO',
  '.OtttsssssssssssssssssssssssOOOOOOOO.',
  '.OttsssssssssssssssssssssuuOWOWOWO...',
  'OttssssssssssssssssssssuuuOOOOOOO....',
  'OtssssssssssssssssssssuuuO...........',
  'OOttsssssssssssssssssuuuuOO..........',
  '.OOOttssssssssssssssuuuuOsO..........',
  '....OOtttssssssssssuuuuOOWO..........',
  '.......OOttssssssuuuuuO.O............',
  '.........OttssOOtssuuO...............',
  '.........OttsO.OtsssO................',
  '.........OttO..OtssO.................',
  '..........OtsO..OtsO.................',
  '.........OtssO..OtssO................',
  '........OsWsWO.OsWsWO................',
  '........OOOOOO.OOOOOO................'
];

// Registry: texture key -> grid. Boot renders all of these.
export const GRIDS = {
  rex: REX,
  raptor: RAPTOR,
  compy: COMPY,
  trike: TRIKE,
  pachy: PACHY,
  sarco: SARCO,
  spino: SPINO
};

// Crouch frame for whole-sprite rigs: drop one mid-body row so the top
// of the sprite compresses down 1px while the feet stay planted.
export const CROUCH_DROP = { raptor: 10, compy: 9, trike: 12, pachy: 11, sarco: 5, spino: 13 };

export function crouchGrid(grid, drop) {
  const blank = '.'.repeat(grid[0].length);
  return [blank, ...grid.slice(0, drop), ...grid.slice(drop + 1)];
}
