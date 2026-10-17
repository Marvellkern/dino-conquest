import { W, H, GROUND_Y } from '../config.js';
import { E32 as C } from '../data/palette.js';
import { PAD, LW, rnd, dither, bands, disc, layer } from './artKit.js';
import { VOLCANO, CRATER } from './zoneArt2.js';

// Layered zone backdrops (Endesga 32 only). Each zone has 4 layers (sky, far,
// mid, near/FG), pre-rendered to a texture once and reused. Layers sway by a
// pixel or two, shift a little with `backdrop.shift` (the battle sets it from
// lunges), and ambient particles keep something moving.
//   depth 0 sky, 1 far, 2 mid (+ ground), 3 ambient, 4-5 dinos, 8 near/FG
/* ---------- Jungle: warm golden-green, volcano far off, big trees, giant ferns ---------- */

const JUNGLE = {
  sky(g) {
    bands(g, [C.forest, C.pine, C.deepTeal, C.night], 0, GROUND_Y);
    // Sun haze, top-left.
    disc(g, 40, 16, 26, C.green);
    for (let r = 26; r > 18; r -= 2) dither(g, 40 - r, 16 + r - 2, r * 2, 1, C.green, C.yellow);
    disc(g, 40, 16, 16, C.yellow);
    disc(g, 40, 16, 9, C.white);
  },
  far(g) {
    // Distant volcano with a smoke plume and a hot crater.
    g.fillStyle(C.slate);
    for (let y = 0; y < 62; y++) {
      const half = 10 + Math.round(y * 1.3);
      g.fillRect(240 - half, 46 + y, half * 2, 1);
    }
    g.fillStyle(C.steel).fillRect(232, 46, 16, 2);
    g.fillStyle(C.amber).fillRect(236, 45, 8, 1);
    for (let i = 0; i < 26; i++) {
      const x = 236 + Math.round(Math.sin(i * 0.5) * 6) - i, y = 42 - i;
      dither(g, x, y, 8 + (i >> 2), 1, C.steel, C.silver);
    }
    // Far tree line (cool and dark, so the dinos in front read clearly).
    g.fillStyle(C.deepTeal);
    for (let x = 0; x < LW; x += 14) {
      const h = 18 + Math.round(rnd(x, 14));
      disc(g, x + 6, GROUND_Y - 32 - h + 8, 9, C.deepTeal);
      g.fillRect(x, GROUND_Y - 32 - h + 8, 14, h + 32);
    }
  },
  mid(g) {
    // Big trees: trunks, rounded canopy clumps, hanging vines.
    for (const [x, tw] of [[18, 12], [118, 9], [208, 11], [300, 10]]) {
      g.fillStyle(C.darkBrown).fillRect(x, 20, tw, GROUND_Y - 20);
      g.fillStyle(C.brown).fillRect(x + 2, 20, 2, GROUND_Y - 20);
      g.fillStyle(C.darkBrown).fillRect(x - 3, GROUND_Y - 6, tw + 6, 6); // root flare
      for (let k = 0; k < 4; k++) {
        const cx = x + tw / 2 + [-14, 10, -4, 18][k], cy = [14, 10, 26, 24][k];
        disc(g, cx, cy + 1, 13, C.deepTeal);
        disc(g, cx, cy, 12, C.pine);
        disc(g, cx - 2, cy - 4, 6, C.forest);
      }
      g.fillStyle(C.forest);
      for (let v = -16; v < 26; v += 7) {
        const len = 18 + Math.round(rnd(x + v, 26));
        g.fillRect(x + v, 30, 1, len);
        g.fillRect(x + v - 1, 30 + len - 2, 3, 2);
      }
    }
    // Undergrowth behind the fighters.
    for (let x = 0; x < LW; x += 11) {
      const h = 8 + Math.round(rnd(x + 3, 10));
      disc(g, x + 5, GROUND_Y - h + 4, 6, C.night);
    }
    // Ground: dirt, a lit edge, pebbles.
    g.fillStyle(C.brown).fillRect(0, GROUND_Y, LW, H - GROUND_Y);
    g.fillStyle(C.clay).fillRect(0, GROUND_Y, LW, 1);
    g.fillStyle(C.darkBrown).fillRect(0, GROUND_Y + 2, LW, 1);
    for (let y = GROUND_Y + 5, row = 0; y < H; y += 5, row++) {
      for (let x = row % 2 ? 0 : 8; x < LW; x += 16) g.fillRect(x, y, 3, 1);
    }
  },
  near(g) {
    // Giant ferns in both bottom corners, flowers, grass tufts on the ground line.
    const fern = (bx, dir) => {
      for (let f = 0; f < 5; f++) {
        const a = -1.4 + f * 0.35, len = 34 + f * 4;
        for (let t = 0; t < len; t += 2) {
          const x = bx + dir * Math.round(Math.cos(a) * t * 0.8 + t * 0.2), y = GROUND_Y + 8 - Math.round(Math.sin(-a) * t * 0.9) + Math.round((t * t) / 90);
          g.fillStyle(t % 4 ? C.forest : C.green).fillRect(x, y, 2, 2);
          g.fillStyle(C.pine).fillRect(x + dir * 2, y + 1, 2, 1).fillRect(x - dir * 2, y + 1, 2, 1);
        }
      }
    };
    fern(4, 1);
    fern(LW - 6, -1);
    for (const [x, y, c] of [[22, GROUND_Y - 6, C.red], [30, GROUND_Y - 2, C.gold], [LW - 26, GROUND_Y - 5, C.salmon]]) {
      g.fillStyle(c).fillRect(x - 1, y, 3, 1).fillRect(x, y - 1, 1, 3);
      g.fillStyle(C.yellow).fillRect(x, y, 1, 1);
    }
    for (let x = 40; x < LW - 40; x += 23) {
      const h = 3 + Math.round(rnd(x, 3));
      g.fillStyle(C.forest).fillRect(x, GROUND_Y - h + 1, 1, h).fillRect(x + 2, GROUND_Y - h + 2, 1, h - 1);
      g.fillStyle(C.green).fillRect(x + 1, GROUND_Y - h, 1, h + 1);
    }
  },
  ambient(scene, add) {
    // Light shafts from the sun, fireflies, falling leaves.
    const shaft = scene.add.graphics().setDepth(2.5);
    shaft.fillStyle(C.yellow, 1);
    for (let s = 0; s < 3; s++) for (let y = 30; y < GROUND_Y; y += 2) {
      const x0 = 60 + s * 70 + Math.round(y * 0.5);
      for (let x = x0 + (y % 4 ? 0 : 1); x < x0 + 10 + s * 2; x += 4) shaft.fillRect(x, y, 1, 1);
    }
    scene.tweens.add({ targets: shaft, alpha: { from: 0.15, to: 0.4 }, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    for (let i = 0; i < 8; i++) add(firefly(scene, i));
    for (let i = 0; i < 6; i++) add(leaf(scene, i));
  }
};

function firefly(scene, i) {
  const r = scene.add.rectangle(0, 0, 1, 1, C.yellow).setOrigin(0).setDepth(3);
  const p = { x: 20 + rnd(i, 280), y: 70 + rnd(i + 5, 55), ph: rnd(i + 9, 6) };
  return (t) => {
    r.setPosition(Math.round(p.x + Math.sin(t / 1300 + p.ph) * 10), Math.round(p.y + Math.sin(t / 900 + p.ph * 2) * 5));
    r.setVisible(Math.sin(t / 400 + p.ph * 3) > -0.2);
  };
}

function leaf(scene, i) {
  const r = scene.add.rectangle(0, 0, 2, 1, i % 2 ? C.green : C.forest).setOrigin(0).setDepth(3);
  const p = { x: rnd(i + 2, W), y: rnd(i + 7, GROUND_Y), v: 6 + rnd(i, 6) };
  return (t, dt) => {
    p.y += (p.v * dt) / 1000;
    if (p.y > GROUND_Y) { p.y = 20; p.x = rnd(t + i, W); }
    r.setPosition(Math.round(p.x + Math.sin(p.y / 9 + i) * 4), Math.round(p.y));
    r.setSize(Math.sin(p.y / 5) > 0 ? 2 : 1, 1);
  };
}

/* ---------- Swamp: teal-olive fog, dead trees, mangrove roots, lily pads ---------- */

const SWAMP = {
  sky(g) {
    bands(g, [C.steel, C.slate, C.pine, C.deepTeal], 0, GROUND_Y);
    dither(g, 0, 30, LW, 10, C.slate, C.forest); // sickly olive haze
    dither(g, 0, 62, LW, 6, C.pine, C.slate);
  },
  far(g) {
    // Dead tree silhouettes: bare trunks with crooked branches.
    g.fillStyle(C.dusk);
    for (const [x, h] of [[30, 90], [96, 70], [170, 100], [248, 80], [312, 95]]) {
      const top = GROUND_Y - 14 - h;
      g.fillRect(x, top, 5, h);
      for (let b = 0; b < 4; b++) {
        const by = top + 8 + b * 14, dir = b % 2 ? 1 : -1, len = 10 + Math.round(rnd(x + b, 8));
        for (let t = 0; t < len; t++) g.fillRect(x + 2 + dir * t, by - Math.round(t * 0.6), 2, 1);
      }
    }
  },
  mid(g) {
    // Murky water with reflections and lily pads, then mangrove roots and reeds.
    const wy = GROUND_Y - 20;
    g.fillStyle(C.deepTeal).fillRect(0, wy, LW, 20);
    g.fillStyle(C.pine).fillRect(0, wy, LW, 1);
    for (let i = 0; i < 24; i++) {
      const x = Math.round(rnd(i, LW)), y = wy + 3 + Math.round(rnd(i + 4, 15));
      g.fillStyle(i % 3 ? C.navy : C.slate).fillRect(x, y, 4 + (i % 4) * 2, 1);
    }
    for (const [x, y] of [[54, wy + 8], [140, wy + 12], [226, wy + 6], [290, wy + 14]]) {
      g.fillStyle(C.forest).fillRect(x - 5, y, 11, 2).fillRect(x - 3, y - 1, 7, 1);
      g.fillStyle(C.green).fillRect(x - 3, y - 1, 3, 1);
      g.fillStyle(C.deepTeal).fillRect(x, y - 1, 1, 2); // the notch
      g.fillStyle(C.navy).fillRect(x - 4, y + 2, 9, 1); // reflection
    }
    for (const x of [12, 92, 186, 268]) { // mangrove roots arching into the water
      g.fillStyle(C.darkBrown).fillRect(x + 8, 20, 6, wy - 16);
      for (let r = 0; r < 4; r++) {
        const rx = x + r * 6;
        for (let t = 0; t < 18; t++) g.fillRect(rx + Math.round(Math.sin(t / 6) * 4), wy - 18 + t, 2, 1);
      }
      g.fillStyle(C.brown).fillRect(x + 9, 20, 1, wy - 16);
      disc(g, x + 11, 18, 14, C.deepTeal);
      disc(g, x + 11, 16, 12, C.pine);
    }
    for (let x = 4; x < LW; x += 9) { // reeds
      const h = 10 + Math.round(rnd(x, 12));
      g.fillStyle(C.forest).fillRect(x, wy - h + 6, 1, h).fillRect(x + 2, wy - h + 9, 1, h - 3);
    }
    // Mud bank.
    g.fillStyle(C.darkBrown).fillRect(0, GROUND_Y, LW, H - GROUND_Y);
    g.fillStyle(C.brown).fillRect(0, GROUND_Y, LW, 1);
    for (let y = GROUND_Y + 4, row = 0; y < H; y += 6, row++) {
      for (let x = row % 2 ? 4 : 18; x < LW; x += 28) {
        g.fillStyle(C.deepTeal).fillRect(x, y, 7, 2);
        g.fillStyle(C.slate).fillRect(x + 1, y, 3, 1);
      }
    }
  },
  near(g) {
    // Cattails and reeds in the corners, a lily pad at the edge.
    const clump = (bx, dir) => {
      for (let k = 0; k < 6; k++) {
        const x = bx + dir * k * 4, h = 30 + Math.round(rnd(bx + k, 22));
        for (let t = 0; t < h; t++) g.fillStyle(t % 5 ? C.forest : C.green).fillRect(x + dir * Math.round((t * t) / 400), GROUND_Y + 8 - t, 1, 1);
        if (k % 2 === 0) {
          const tx = x + dir * Math.round((h * h) / 400);
          g.fillStyle(C.brown).fillRect(tx - 1, GROUND_Y + 8 - h - 6, 3, 6);
          g.fillStyle(C.clay).fillRect(tx - 1, GROUND_Y + 8 - h - 6, 1, 4);
        }
      }
    };
    clump(6, 1);
    clump(LW - 8, -1);
  },
  ambient(scene, add) {
    for (let i = 0; i < 2; i++) add(mist(scene, i));
    for (let i = 0; i < 7; i++) add(bubble(scene, i));
    for (let i = 0; i < 2; i++) add(dragonfly(scene, i));
  }
};

function mist(scene, i) {
  const key = `mist_${i}`;
  if (!scene.textures.exists(key)) {
    const g = scene.make.graphics({ add: false });
    g.fillStyle(C.silver);
    for (let y = 0; y < 8; y++) for (let x = (y % 2) * 2 + i; x < 200; x += 4 + (y % 3)) if (Math.sin(x / 17 + y) > -0.3) g.fillRect(x, y, 1, 1);
    g.generateTexture(key, 200, 8);
    g.destroy();
  }
  const img = scene.add.image(0, 0, key).setOrigin(0).setDepth(3).setAlpha(0.35);
  const p = { x: rnd(i + 1, W), y: 80 + i * 26, v: 4 + i * 3 };
  return (t, dt) => {
    p.x += (p.v * dt) / 1000;
    if (p.x > W) p.x = -200;
    img.setPosition(Math.round(p.x), p.y);
  };
}

function bubble(scene, i) {
  const r = scene.add.rectangle(0, 0, 1, 1, C.silver).setOrigin(0).setDepth(3);
  const p = { x: 0, y: 0, life: 0 };
  const reset = (t) => { p.x = Math.round(rnd(t / 7 + i * 31, W)); p.y = GROUND_Y - 2 - Math.round(rnd(i + t, 16)); p.life = 600 + rnd(i * 3 + t, 1400); };
  reset(i * 999);
  return (t, dt) => {
    p.life -= dt;
    p.y -= dt / 400;
    if (p.life <= 0) reset(t);
    r.setPosition(p.x, Math.round(p.y)).setSize(p.life < 120 ? 2 : 1, 1);
  };
}

function dragonfly(scene, i) {
  const body = scene.add.rectangle(0, 0, 3, 1, C.cyan).setOrigin(0).setDepth(3);
  const wing = scene.add.rectangle(0, 0, 1, 1, C.white).setOrigin(0).setDepth(3);
  const ph = i * 2.7;
  return (t) => {
    const x = Math.round(W / 2 + Math.sin(t / 2100 + ph) * 130), y = Math.round(78 + i * 20 + Math.sin(t / 700 + ph) * 8);
    body.setPosition(x, y);
    wing.setPosition(x + 1, y - 1).setVisible(Math.floor(t / 50) % 2 === 0);
  };
}

/* ---------- assembly ---------- */

const ZONES = { jungle: JUNGLE, swamp: SWAMP, volcano: VOLCANO, crater: CRATER };
// Sway amplitude (px) and period (ms), parallax factor per layer.
const MOTION = { far: [1, 5200, 0.03], mid: [1, 4100, 0.08], near: [2, 2600, 0.2] };

// Returns { shift } — set shift (px, signed) each frame for the lunge parallax.
// opts.progress (0-1): how far into the zone (the Crater's meteor grows).
export function zoneBackdrop(scene, zoneId, opts = {}) {
  const z = ZONES[zoneId] ?? JUNGLE, id = ZONES[zoneId] ? zoneId : 'jungle';
  layer(scene, `bg_${id}_sky`, 0, z.sky);
  const layers = {
    far: layer(scene, `bg_${id}_far`, 1, z.far),
    mid: layer(scene, `bg_${id}_mid`, 2, z.mid),
    near: layer(scene, `bg_${id}_near`, 8, z.near)
  };
  const ambient = [];
  z.ambient(scene, (fn) => ambient.push(fn), opts);
  const bd = { shift: 0 };
  let t = 0;
  const tick = (_, dt) => {
    dt *= scene.time.timeScale; // freezes with hitstop
    t += dt;
    for (const [k, img] of Object.entries(layers)) {
      const [amp, period, par] = MOTION[k];
      img.x = -PAD + Math.round(Math.sin((t / period) * Math.PI * 2) * amp) - Math.round(bd.shift * par);
    }
    for (const fn of ambient) fn(t, dt);
  };
  scene.events.on('update', tick);
  scene.events.once('shutdown', () => scene.events.off('update', tick));
  return bd;
}
