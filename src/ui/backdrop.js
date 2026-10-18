import { W, H } from '../config.js';
import { zoneBackdrop } from './zoneArt.js';

// Battle / title backdrops are layered and animated: see ui/zoneArt.js.
export const drawZone = (scene, zone, opts) => zoneBackdrop(scene, zone, opts);
export const drawJungle = (scene) => zoneBackdrop(scene, 'jungle');

// Zone-map background: dark bands plus scattered tufts, tinted per zone.
const MAP_TINT = {
  jungle: { bands: [0x101c16, 0x13221a, 0x16281e, 0x13221a], tuft: 0x1c3424 },
  swamp: { bands: [0x111a18, 0x14201e, 0x172624, 0x14201e], tuft: 0x24403a },
  volcano: { bands: [0x181425, 0x1e1620, 0x24181c, 0x1e1620], tuft: 0x3e2731 },
  crater: { bands: [0x181425, 0x1c1830, 0x201a38, 0x1c1830], tuft: 0x3a4466 }
};
export function drawMapBackground(scene, zone) {
  const t = MAP_TINT[zone] ?? MAP_TINT.jungle;
  const g = scene.add.graphics();
  const bh = Math.ceil(H / 4);
  t.bands.forEach((c, i) => g.fillStyle(c).fillRect(0, i * bh, W, bh));
  g.fillStyle(t.tuft);
  for (let i = 0; i < Math.round((70 * W * H) / (320 * 180)); i++) {
    const x = (i * 53) % W, y = 44 + ((i * 97) % (H - 68));
    g.fillRect(x, y, 3, 1).fillRect(x + 1, y - 1, 1, 1);
  }
  if (zone === 'swamp') { // a few dark pools
    g.fillStyle(0x0e1a1a);
    for (let i = 0; i < 8; i++) g.fillRect((i * 89 + 20) % W, 50 + ((i * 41) % (H - 80)), 14, 3);
  }
  return g;
}

// Dark cave-nest room: rock bands, a warm glow and a straw nest at (cx, groundY).
// The nest's front lip is drawn on a higher depth so whatever sits in it is tucked in.
export function drawNestRoom(scene, cx, groundY) {
  const g = scene.add.graphics();
  const bands = [0x1a1d23, 0x1e2128, 0x22262e, 0x262a33];
  bands.forEach((c, i) => g.fillStyle(c).fillRect(0, i * 36, W, 36));
  g.fillStyle(0x2a2620).fillRect(0, groundY, W, H - groundY);
  g.fillStyle(0x3a3428).fillRect(0, groundY, W, 1);
  // Warm glow behind the nest: stepped half-discs, no gradients.
  [[56, 0x24262a], [44, 0x2a2a2c], [32, 0x30302e]].forEach(([r, c]) => {
    g.fillStyle(c);
    for (let dy = 0; dy < r; dy += 2) {
      const w = Math.round(Math.sqrt(r * r - dy * dy));
      g.fillRect(cx - w, groundY - dy - 2, w * 2, 2);
    }
  });

  // Straw bowl: back rim behind the occupant, front lip in front of it.
  const straw = [0x8a6a3a, 0x6e5230, 0xa88448];
  const back = scene.add.graphics().setDepth(4);
  const front = scene.add.graphics().setDepth(6);
  for (let i = 0; i < 12; i++) {
    const w = 64 - Math.abs(i - 5) * 4, y = groundY - 11 + i;
    (i < 5 ? back : front).fillStyle(straw[i % 3]).fillRect(cx - w / 2, y, w, 1);
  }
  front.fillStyle(0x4a3820);
  for (let x = cx - 26; x < cx + 26; x += 5) front.fillRect(x, groundY - 4 + (x % 2), 3, 1);
  front.fillStyle(0xc8a058);
  for (let x = cx - 22; x < cx + 22; x += 7) front.fillRect(x, groundY - 6, 2, 1);
  return g;
}
