import { music } from '../systems/music.js';
import { trackFor } from '../data/music.js';

// A fight's music (music brief §6-7): the zone track (the map's, so it keeps playing) on
// the battle or elite layer, or the boss track. While the player is under 25% HP the music
// goes muffled with a heartbeat; leaving the fight resets that and boss phase 2.
const LOW_HP_AT = 0.25;
export function battleMusic(scene, { zone, boss = false, elite = false }) {
  music.setLayer(elite ? 'elite' : 'battle');
  music.play(trackFor(zone, { boss }));
  const check = () => {
    const p = scene.st?.player;
    if (p) music.setLowHp(p.hp > 0 && p.hp < p.maxHp * LOW_HP_AT);
  };
  scene.events.on('update', check);
  scene.events.once('shutdown', () => {
    scene.events.off('update', check);
    music.setLowHp(false);
    music.setPhase2(false);
  });
}
