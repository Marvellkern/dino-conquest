import { isReady } from './combat.js';

// Enemy move choice: finish a charge-up, Special when ready, Roar while healthy
// and the player isn't already debuffed, otherwise mostly Bite with the odd Tail Whip.
export function chooseMove(self, foe, rng) {
  const special = self.moves[3];
  if (self.status.charge > 0) return special;
  if (isReady(self, special)) return special;
  if (isReady(self, 'roar') && self.hp > self.maxHp * 0.7 && foe.status.atkDown <= 0 && rng.chance(0.6)) return 'roar';
  return rng.chance(0.25) ? 'tail' : 'bite';
}
