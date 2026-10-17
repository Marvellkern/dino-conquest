// Meteor Shard events: 2–3 options with clear tradeoffs. run(ctx) applies the
// effects through ctx helpers and returns the result lines. Helpers:
//   ctx.rng, ctx.stat(key, n), ctx.maxHp(n), ctx.hurt(frac), ctx.heal(frac),
//   ctx.xp(n), ctx.amber(n), ctx.relic(), ctx.mutation(), ctx.loseRelic()
// relic() / mutation() return a promise (they open a pick); run may be async.
// need(ctx) on an option disables it (with a reason) when it can't be afforded.
export const EVENTS = [
  {
    title: 'GLOWING SHARD',
    lines: ['A SHARD OF THE METEOR', 'PULSES IN THE MUD.'],
    options: [
      { label: 'EAT IT', sub: '+1 MUTATION, -15 MAX HP', run: async (c) => ['IT TWISTS INSIDE YOU.', c.maxHp(-15), await c.mutation()] },
      { label: 'LEAVE IT', sub: 'NOTHING HAPPENS', run: () => ['IT KEEPS PULSING.'] }
    ]
  },
  {
    title: 'TAR PIT',
    lines: ['OLD BONES STICK OUT', 'OF THE BUBBLING TAR.'],
    options: [
      { label: 'WADE IN', sub: '-25% HP, GAIN A FOSSIL', run: async (c) => ['YOU DRAG ONE OUT.', c.hurt(0.25), await c.relic()] },
      { label: 'GO AROUND', sub: 'SAFE', run: () => ['BETTER SAFE.'] }
    ]
  },
  {
    title: 'OLD CARCASS',
    lines: ['A HALF-EATEN MEAL.', 'IT SMELLS... RIPE.'],
    options: [
      { label: 'EAT IT', sub: '70%: HEAL 40%  30%: -15% HP',
        run: (c) => (c.rng.chance(0.7) ? ['DELICIOUS.', c.heal(0.4)] : ['BAD MEAT!', c.hurt(0.15)]) },
      { label: 'GNAW THE BONES', sub: '+1 ATK, -10% HP', run: (c) => ['TOUGH, BUT WORTH IT.', c.stat('atk', 1), c.hurt(0.1)] },
      { label: 'LEAVE', sub: 'NOTHING HAPPENS', run: () => ['YOU MOVE ON.'] }
    ]
  },
  {
    title: 'ABANDONED NEST',
    lines: ['A NEST OF AMBER-SHELLED', 'EGGS. NO PARENT IN SIGHT.'],
    options: [
      { label: 'TAKE THE EGGS', sub: '+25 AMBER, AN AMBUSH: -20% HP', run: (c) => ['THE PARENT WAS CLOSE!', c.amber(25), c.hurt(0.2)] },
      { label: 'REST IN IT', sub: 'HEAL 25%', run: (c) => ['WARM AND QUIET.', c.heal(0.25)] }
    ]
  },
  {
    title: 'SLEEPING GIANT',
    lines: ['A HUGE LONG-NECK SLEEPS', 'ACROSS THE TRAIL.'],
    options: [
      { label: 'SNEAK PAST', sub: '+40 XP', run: (c) => ['NOT A TWITCH.', ...c.xp(40)] },
      { label: 'STEAL ITS FRUIT', sub: '50%: HEAL 50%  50%: -30% HP',
        run: (c) => (c.rng.chance(0.5) ? ['SWEET VICTORY.', c.heal(0.5)] : ['IT ROLLS ON YOU!', c.hurt(0.3)]) }
    ]
  },
  {
    title: 'BONE ALTAR',
    lines: ['SOMEONE STACKED OLD', 'FOSSILS INTO A SHRINE.'],
    options: [
      { label: 'TRADE A FOSSIL', sub: 'LOSE ONE, PICK A NEW ONE', need: (c) => (c.relicCount() ? null : 'NO FOSSIL TO TRADE'),
        run: async (c) => ['THE ALTAR ACCEPTS.', c.loseRelic(), await c.relic()] },
      { label: 'PRAY', sub: '+10 MAX HP', run: (c) => ['YOU FEEL STURDIER.', c.maxHp(10)] },
      { label: 'LEAVE', sub: 'NOTHING HAPPENS', run: () => ['YOU MOVE ON.'] }
    ]
  },
  {
    title: 'METEOR CRATER',
    lines: ['THE GROUND STILL HISSES', 'WHERE A ROCK FELL.'],
    options: [
      { label: 'DIG IN', sub: '-30 AMBER, GAIN A FOSSIL', need: (c) => (c.amberLeft() >= 30 ? null : 'NEED 30 AMBER'),
        run: async (c) => ['YOU FIND SOMETHING.', c.amber(-30), await c.relic()] },
      { label: 'BASK IN THE HEAT', sub: '+2 DEF, -10 MAX HP', run: (c) => ['YOUR HIDE HARDENS.', c.stat('def', 2), c.maxHp(-10)] },
      { label: 'LEAVE', sub: 'NOTHING HAPPENS', run: () => ['YOU MOVE ON.'] }
    ]
  },
  {
    title: 'MUD WALLOW',
    lines: ['A COOL, DEEP MUD BATH', 'CALLS TO YOU.'],
    options: [
      { label: 'WALLOW', sub: 'HEAL 30%, -10 AMBER (DIRTY)', run: (c) => ['AAAAH.', c.heal(0.3), c.amber(-10)] },
      { label: 'ROLL AND PLAY', sub: '+1 SPD, +20 XP', run: (c) => ['YOU FEEL NIMBLE.', c.stat('spd', 1), ...c.xp(20)] }
    ]
  }
];
