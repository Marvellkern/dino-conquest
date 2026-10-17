// Zone-map node icons (12 wide). The boss node uses the zone boss's own sprite.
// Hearts (7x6) show lives.
export const ICONS = {
  // Enemy intent icons (8x8) and the target arrow.
  int_attack:   ['.OOOOOO.', 'OWWWWWWO', 'OWWWWWWO', '.OWWWWO.', '.OWWWWO.', '..OWWO..', '..OWWO..', '...OO...'],
  int_charge:   ['....OOO.', '...OSSO.', '..OSSO..', '.OSSSSO.', '.OOSSO..', '..OSO...', '..OO....', '..O.....'],
  int_defend:   ['OOOOOOOO', 'OWTTTTWO', 'OTTTTTTO', 'OTTTTTTO', 'OTTTTTTO', '.OTTTTO.', '..OTTO..', '...OO...'],
  int_debuff:   ['..OOOO..', '..OEEO..', '..OEEO..', 'OOOEEOOO', 'OEEEEEEO', '.OEEEEO.', '..OEEO..', '...OO...'],
  int_stun:     ['OOOOOOO.', 'OSSSSSO.', 'OOOOSO..', '...OSO..', '..OSO...', '.OSOOOO.', 'OSSSSSO.', 'OOOOOOO.'],
  int_submerge: ['........', '.OO..OO.', 'OQQOOQQO', 'QOOQQOOQ', '........', '.OO..OO.', 'OQQOOQQO', 'QOOQQOOQ'],
  int_flood:    ['...OO...', '..OQQO..', '..OQQO..', '.OQQQQO.', 'OQQQQWQO', 'OQQQQWQO', '.OQQQQO.', '..OOOO..'],
  target_arrow: ['OOOOOOO', 'OSSSSSO', '.OSSSO.', '..OSO..', '...O...'],
  heart: ['.OO.OO.', 'OEEOEEO', 'OEEEEEO', '.OEEEO.', '..OEO..', '...O...'],
  crown: ['S..S..S', 'SS.S.SS', 'SSSSSSS', 'SFSFSFS', 'SSSSSSS', 'OOOOOOO'],
  heart_empty: ['.OO.OO.', 'OPPOPPO', 'OPPPPPO', '.OPPPO.', '..OPO..', '...O...'],
  icon_fight: [
    '.OOOOOOOOOO.',
    'OMMMMMMMMMMO',
    'OMMMMMMMMMMO',
    '.OWWOOOOWWO.',
    '.OWWO..OWWO.',
    '.OWWO..OWWO.',
    '..OWO..OWO..',
    '..OWO..OWO..',
    '...OO..OO...'
  ],
  icon_elite: [
    'OO........OO',
    'OWO......OWO',
    '.OWOOOOOOWO.',
    '..OWWWWWWO..',
    '.OWWWWWWWWO.',
    '.OWEEWWEEWO.',
    '.OWEEWWEEWO.',
    '.OWWWOOWWWO.',
    '..OWWWWWWO..',
    '..OWOWOWOO..',
    '...OOOOOO...'
  ],
  icon_nest: [
    '....OOOO....',
    '...OAAAAO...',
    '..OAAXAAAO..',
    '..OAAAAXAO..',
    '..OAXAAAAO..',
    '.BOZAAAAZOB.',
    'BKBOOOOOOBKB',
    '.BKBKBKBKBK.',
    '..BBBBBBBB..'
  ],
  icon_fossil: [
    '.OO......OO.',
    'OWWO....OWWO',
    'OWWWOOOOWWWO',
    '.OWWWWWWWWO.',
    'OWWWOOOOWWWO',
    'OWWO....OWWO',
    '.OO......OO.'
  ],
  icon_meteor: [
    'S...........',
    '.SR.........',
    '..RSR.......',
    '...RERROOO..',
    '....ERRBBBO.',
    '.....OBKBBBO',
    '.....OBBBKBO',
    '.....OBKBBBO',
    '......OBBBO.',
    '.......OOO..'
  ]
};
