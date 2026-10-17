// Fossil Dig stat upgrades. amount(base species) -> bonus added to that stat.
export const STAT_UPS = [
  { stat: 'hp',  label: 'THICK BONES',  sub: '+15% MAX HP', amount: (sp) => Math.round(sp.hp * 0.15) },
  { stat: 'atk', label: 'SHARP TEETH',  sub: '+2 ATK',      amount: () => 2 },
  { stat: 'def', label: 'TOUGH SCALES', sub: '+2 DEF',      amount: () => 2 },
  { stat: 'spd', label: 'LONG LEGS',    sub: '+2 SPD',      amount: () => 2 }
];
