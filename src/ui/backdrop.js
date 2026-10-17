import { W, H, GROUND_Y } from '../config.js';

// Chunky code-drawn jungle backdrop: sky bands, two foliage layers, ground tiles.
export function drawJungle(scene) {
  const g = scene.add.graphics();
  const bands = [0x16302e, 0x1a3a34, 0x1f463a, 0x255240, 0x2c5e44];
  const bh = Math.ceil(GROUND_Y / bands.length);
  bands.forEach((c, i) => g.fillStyle(c).fillRect(0, i * bh, W, bh));

  // Far foliage: blocky canopy humps.
  g.fillStyle(0x183a2c);
  for (let x = -8; x < W; x += 22) {
    const h = 38 + ((x * 7 + 56) % 17);
    g.fillRect(x, GROUND_Y - h, 18, h);
    g.fillRect(x + 4, GROUND_Y - h - 6, 10, 6);
  }
  // Near foliage: ferns along the ground.
  g.fillStyle(0x234a2a);
  for (let x = 0; x < W; x += 9) {
    const h = 6 + ((x * 13) % 9);
    g.fillRect(x, GROUND_Y - h, 6, h);
    g.fillRect(x + 2, GROUND_Y - h - 3, 2, 3);
  }

  // Ground: dirt with a staggered pebble pattern.
  g.fillStyle(0x4a3a26).fillRect(0, GROUND_Y, W, H - GROUND_Y);
  g.fillStyle(0x5e4a30).fillRect(0, GROUND_Y, W, 2);
  g.fillStyle(0x2e2418).fillRect(0, GROUND_Y + 2, W, 1);
  g.fillStyle(0x3a2e1e);
  for (let y = GROUND_Y + 6, row = 0; y < H; y += 6, row++) {
    for (let x = row % 2 ? 0 : 8; x < W; x += 16) g.fillRect(x, y, 3, 1);
  }
  return g;
}

// Murky swamp: hazy green sky, drooping cypress trunks, reeds, a strip of
// dark water with ripple lines, and a mud bank for the fighters to stand on.
export function drawSwamp(scene) {
  const g = scene.add.graphics();
  const bands = [0x1c2a22, 0x203226, 0x263a2a, 0x2c422c, 0x33482e];
  const bh = Math.ceil(GROUND_Y / bands.length);
  bands.forEach((c, i) => g.fillStyle(c).fillRect(0, i * bh, W, bh));

  // Far cypress trunks with hanging moss.
  for (let x = 6; x < W; x += 34) {
    const h = 70 + ((x * 11) % 23), tw = 6 + ((x * 3) % 4);
    g.fillStyle(0x1a2620).fillRect(x, GROUND_Y - h, tw, h);
    g.fillRect(x - 2, GROUND_Y - 8, tw + 4, 8); // flared root
    g.fillStyle(0x24382a).fillRect(x - 8, GROUND_Y - h - 4, tw + 16, 6);
    g.fillStyle(0x3e5a36);
    for (let m = x - 6; m < x + tw + 8; m += 4) g.fillRect(m, GROUND_Y - h + 2, 1, 4 + ((m * 7) % 9));
  }

  // Water strip just behind the bank, with pale ripples.
  const wy = GROUND_Y - 14;
  g.fillStyle(0x1e3a34).fillRect(0, wy, W, 14);
  g.fillStyle(0x28483e).fillRect(0, wy, W, 1);
  g.fillStyle(0x5e8a70);
  for (let i = 0; i < 18; i++) {
    const x = (i * 47 + 11) % W, y = wy + 3 + ((i * 5) % 9);
    g.fillRect(x, y, 4 + (i % 3) * 2, 1);
  }
  // Reeds and cattails poking out of the water.
  for (let x = 3; x < W; x += 13) {
    const h = 8 + ((x * 7) % 10);
    g.fillStyle(0x3a5a2c).fillRect(x, GROUND_Y - h, 1, h).fillRect(x + 2, GROUND_Y - h + 3, 1, h - 3);
    if (x % 3 === 0) g.fillStyle(0x6a4628).fillRect(x, GROUND_Y - h - 3, 1, 3);
  }

  // Mud bank: dark olive with puddles.
  g.fillStyle(0x3a3a24).fillRect(0, GROUND_Y, W, H - GROUND_Y);
  g.fillStyle(0x50502e).fillRect(0, GROUND_Y, W, 2);
  g.fillStyle(0x24261a).fillRect(0, GROUND_Y + 2, W, 1);
  for (let y = GROUND_Y + 6, row = 0; y < H; y += 7, row++) {
    for (let x = row % 2 ? 4 : 18; x < W; x += 28) {
      g.fillStyle(0x24382e).fillRect(x, y, 7, 2);
      g.fillStyle(0x4a6a58).fillRect(x + 1, y, 3, 1);
    }
  }
  return g;
}

const BACKDROPS = { jungle: drawJungle, swamp: drawSwamp };
export const drawZone = (scene, zone) => (BACKDROPS[zone] ?? drawJungle)(scene);

// Zone-map background: dark bands plus scattered tufts, tinted per zone.
const MAP_TINT = {
  jungle: { bands: [0x101c16, 0x13221a, 0x16281e, 0x13221a], tuft: 0x1c3424 },
  swamp: { bands: [0x111a18, 0x14201e, 0x172624, 0x14201e], tuft: 0x24403a }
};
export function drawMapBackground(scene, zone) {
  const t = MAP_TINT[zone] ?? MAP_TINT.jungle;
  const g = scene.add.graphics();
  t.bands.forEach((c, i) => g.fillStyle(c).fillRect(0, i * 45, W, 45));
  g.fillStyle(t.tuft);
  for (let i = 0; i < 70; i++) {
    const x = (i * 53) % W, y = 44 + ((i * 97) % 112);
    g.fillRect(x, y, 3, 1).fillRect(x + 1, y - 1, 1, 1);
  }
  if (zone === 'swamp') { // a few dark pools
    g.fillStyle(0x0e1a1a);
    for (let i = 0; i < 8; i++) g.fillRect((i * 89 + 20) % W, 50 + ((i * 41) % 100), 14, 3);
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
