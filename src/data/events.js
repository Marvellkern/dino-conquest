// Meteor Shard events. Each option's run(ctx) applies effects through ctx
// helpers (which return result lines) and returns the lines to show.
//   ctx.rng, ctx.stat(key, n), ctx.hurt(frac), ctx.heal(frac), ctx.xp(n), ctx.poison()
export const EVENTS = [
  {
    title: 'METEOR SHARD',
    lines: ['A GLOWING SHARD HUMS', 'IN A SMOKING CRATER.'],
    options: [
      { label: 'TOUCH IT', sub: '60%: +3 ATK   40%: -30% HP',
        run: (c) => (c.rng.chance(0.6) ? ['IT SURGES INTO YOU!', c.stat('atk', 3)] : ['IT BURNS!', c.hurt(0.3)]) },
      { label: 'WALK AWAY', sub: 'NOTHING HAPPENS', run: () => ['YOU LEAVE IT HUMMING.'] }
    ]
  },
  {
    title: 'TAR PIT',
    lines: ['SOMETHING SHINES DEEP', 'IN THE STICKY TAR.'],
    options: [
      { label: 'WADE IN', sub: '-20% HP, +40 XP', run: (c) => ['YOU DRAG IT OUT.', c.hurt(0.2), ...c.xp(40)] },
      { label: 'GO AROUND', sub: 'SAFE', run: () => ['BETTER SAFE.'] }
    ]
  },
  {
    title: 'OLD CARCASS',
    lines: ['A HALF-EATEN MEAL.', 'IT SMELLS... RIPE.'],
    options: [
      { label: 'EAT IT', sub: '70%: HEAL 35%   30%: -15% HP',
        run: (c) => (c.rng.chance(0.7) ? ['DELICIOUS.', c.heal(0.35)] : ['BAD MEAT!', c.hurt(0.15)]) },
      { label: 'SNIFF AND LEAVE', sub: '+1 DEF FROM CAUTION', run: (c) => ['YOU STAY WARY.', c.stat('def', 1)] }
    ]
  }
];
