import { meta, persist, applySettings } from '../systems/meta.js';
import { sfx } from '../systems/sfx.js';
import { choose } from './popup.js';

// Sound sub-menu (Home settings, pause menu): Music and SFX volume (0-100, each tap +10,
// wrapping) and the mute toggle.
export async function soundMenu(scene) {
  const s = meta.settings, VOLS = ['music', 'sfxVol'];
  for (;;) {
    const items = [
      ['music', { label: `MUSIC: ${s.music}`, sub: 'TAP TO CHANGE' }],
      ['sfxVol', { label: `SFX: ${s.sfxVol}`, sub: 'TAP TO CHANGE' }],
      ['sfx', { label: `SOUND: ${s.sfx ? 'ON' : 'OFF'}` }],
      ['back', { label: 'BACK' }]
    ];
    const pick = items[await choose(scene, { title: 'SOUND', options: items.map(([, o]) => o), bh: 26 })][0];
    if (pick === 'back') return;
    if (VOLS.includes(pick)) s[pick] = (s[pick] + 10) % 110;
    else s.sfx = !s.sfx;
    persist();
    applySettings(scene.registry);
    sfx('blip');
  }
}
