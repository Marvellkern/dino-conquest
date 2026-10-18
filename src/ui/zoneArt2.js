import { LAND } from '../config.js';

import { E32 as C } from '../data/palette.js';
import { LW, rnd, dither, bands, disc } from './artKit.js';

const { W, H, GROUND_Y } = LAND; // drawn in landscape units (see zoneArt.js)

// Volcano and Meteor Crater backdrops (same layer contract as ui/zoneArt.js).

/* ---------- Volcano: smoky red sky, erupting cone, rock spires, lava cracks ---------- */

export const VOLCANO = {
  sky(g) {
    bands(g, [C.ink, C.darkBrown, C.brown, C.crimson], 0, GROUND_Y);
    for (let i = 0; i < 4; i++) dither(g, 0, 8 + i * 13, LW, 3, i % 2 ? C.darkBrown : C.ink, C.dusk); // smoke bands
  },
  far(g) {
    // Erupting volcano: dark cone, glowing crater, lava streaks, a plume of smoke.
    const cx = 210, top = 34;
    g.fillStyle(C.ink);
    for (let y = 0; y < GROUND_Y - top; y++) {
      const half = 12 + Math.round(y * 1.5);
      g.fillRect(cx - half, top + y, half * 2, 1);
    }
    g.fillStyle(C.night).fillRect(cx - 16, top, 32, 2);
    g.fillStyle(C.gold).fillRect(cx - 10, top - 1, 20, 2);
    g.fillStyle(C.yellow).fillRect(cx - 5, top - 1, 10, 1);
    for (const [dx, len] of [[-6, 34], [3, 48], [9, 26]]) { // lava streaks down the slope
      for (let y = 0; y < len; y++) g.fillStyle(y % 6 < 4 ? C.amber : C.gold).fillRect(cx + dx + Math.round(y * dx * 0.08), top + 1 + y, 2, 1);
    }
    for (let i = 0; i < 30; i++) { // plume
      const x = cx - 8 + Math.round(Math.sin(i * 0.4) * 7) - Math.round(i * 0.6), y = top - 3 - i;
      dither(g, x, y, 14 + (i >> 1), 1, i % 3 ? C.darkBrown : C.night, C.dusk);
    }
  },
  mid(g) {
    // Black rock spires with lava falls between them.
    for (const [x, w, h] of [[2, 18, 86], [52, 12, 60], [96, 16, 74], [150, 10, 52], [262, 20, 90], [306, 14, 64]]) {
      const top = GROUND_Y - h;
      for (let y = top; y < GROUND_Y; y++) {
        const k = (y - top) / h, half = Math.round((w / 2) * (0.4 + 0.6 * k));
        g.fillStyle(C.ink).fillRect(x + w / 2 - half, y, half * 2, 1);
        g.fillStyle(C.dusk).fillRect(x + w / 2 - half, y, 1, 1);
      }
    }
    for (const x of [36, 82, 286]) { // lava falls
      for (let y = 30 + (x % 20); y < GROUND_Y; y++) {
        g.fillStyle(C.amber).fillRect(x, y, 3, 1);
        g.fillStyle(y % 5 ? C.gold : C.yellow).fillRect(x + 1, y, 1, 1);
      }
      g.fillStyle(C.gold).fillRect(x - 2, GROUND_Y - 2, 7, 2); // splash pool
    }
    // Cracked ground with glowing seams.
    g.fillStyle(C.darkBrown).fillRect(0, GROUND_Y, LW, H - GROUND_Y);
    g.fillStyle(C.brown).fillRect(0, GROUND_Y, LW, 1);
    for (let i = 0; i < 14; i++) {
      let x = Math.round(rnd(i, LW)), y = GROUND_Y + 2 + Math.round(rnd(i + 3, 10));
      for (let s = 0; s < 8; s++) {
        g.fillStyle(s % 3 ? C.amber : C.gold).fillRect(x, y, 2, 1);
        x += 2;
        y += Math.round(rnd(i * 7 + s, 2)) - (y > GROUND_Y + 12 ? 1 : 0);
      }
    }
  },
  near(g) {
    // Jagged foreground rocks in the corners with glowing cracks.
    const rock = (x0, dir) => {
      for (let i = 0; i < 26; i++) {
        const h = 26 - i + Math.round(rnd(x0 + i, 6));
        g.fillStyle(C.ink).fillRect(x0 + dir * i, GROUND_Y + 8 - h, 1, h);
      }
      g.fillStyle(C.night);
      for (let i = 0; i < 22; i += 3) g.fillRect(x0 + dir * i, GROUND_Y + 8 - (26 - i), 1, 1);
      g.fillStyle(C.amber).fillRect(x0 + dir * 6, GROUND_Y - 4, 1, 6).fillRect(x0 + dir * 7, GROUND_Y + 1, 1, 3);
    };
    rock(0, 1);
    rock(LW - 1, -1);
  },
  ambient(scene, add) {
    for (let i = 0; i < 12; i++) add(ember(scene, i));
    for (let i = 0; i < 8; i++) add(ash(scene, i));
    add(shimmer(scene));
  }
};

function ember(scene, i) {
  const r = scene.add.rectangle(0, 0, 1, 1, i % 3 ? C.amber : C.gold).setOrigin(0).setDepth(3);
  const p = { x: rnd(i, W), y: GROUND_Y - rnd(i + 4, 40), v: 10 + rnd(i + 8, 14) };
  return (t, dt) => {
    p.y -= (p.v * dt) / 1000;
    if (p.y < 10) { p.y = GROUND_Y - 2; p.x = rnd(t + i * 13, W); }
    r.setPosition(Math.round(p.x + Math.sin(p.y / 7 + i) * 3), Math.round(p.y));
    r.setVisible(Math.sin(t / 150 + i) > -0.6);
  };
}

function ash(scene, i) {
  const r = scene.add.rectangle(0, 0, 1, 1, C.steel).setOrigin(0).setDepth(3).setAlpha(0.8);
  const p = { x: rnd(i + 3, W), y: rnd(i + 9, GROUND_Y), v: 4 + rnd(i, 4) };
  return (t, dt) => {
    p.y += (p.v * dt) / 1000;
    p.x += (3 * dt) / 1000;
    if (p.y > GROUND_Y) { p.y = 0; p.x = rnd(t / 3 + i, W); }
    if (p.x > W) p.x = 0;
    r.setPosition(Math.round(p.x), Math.round(p.y));
  };
}

// Heat shimmer: a sparse light band just above the ground that wobbles side to side.
function shimmer(scene) {
  const key = 'heat_shimmer';
  if (!scene.textures.exists(key)) {
    const g = scene.make.graphics({ add: false });
    g.fillStyle(C.peach);
    for (let y = 0; y < 6; y++) for (let x = (y % 2) * 3; x < W + 16; x += 6) g.fillRect(x, y, 2, 1);
    g.generateTexture(key, W + 16, 6);
    g.destroy();
  }
  const img = scene.add.image(-8, GROUND_Y - 14, key).setOrigin(0).setDepth(3).setAlpha(0.12);
  return (t) => { img.x = -8 + Math.round(Math.sin(t / 260) * 3); img.setAlpha(0.08 + 0.06 * Math.sin(t / 700)); };
}

/* ---------- Meteor Crater: purple night, a meteor that grows, crystals, scorched ground ---------- */

export const CRATER = {
  sky(g) {
    bands(g, [C.plum, C.night, C.ink, C.ink], 0, GROUND_Y);
    for (let i = 0; i < 60; i++) { // stars
      const x = Math.round(rnd(i, LW)), y = Math.round(rnd(i + 11, 90));
      g.fillStyle(i % 5 ? C.silver : C.white).fillRect(x, y, 1, 1);
    }
  },
  far(g) {
    // The crater rim: a long dark ridge with a lit edge.
    for (let x = 0; x < LW; x++) {
      const h = 22 + Math.round(Math.sin(x / 40) * 6 + Math.sin(x / 13) * 2);
      g.fillStyle(C.night).fillRect(x, GROUND_Y - 18 - h, 1, h + 18);
      g.fillStyle(C.dusk).fillRect(x, GROUND_Y - 18 - h, 1, 1);
    }
  },
  mid(g) {
    // Glowing crystal clusters, then scorched ground with shards.
    const crystal = (x, base, h, w, c1, c2) => {
      for (let y = 0; y < h; y++) {
        const half = Math.max(0, Math.round(w * (1 - y / h)));
        g.fillStyle(c1).fillRect(x - half, base - y, half * 2 + 1, 1);
        g.fillStyle(c2).fillRect(x - half, base - y, 1, 1);
      }
      g.fillStyle(C.white).fillRect(x, base - h + 1, 1, 2);
    };
    for (const [x, s] of [[24, 1], [70, 0.6], [128, 0.8], [196, 0.5], [248, 1], [300, 0.7]]) {
      crystal(x, GROUND_Y - 1, Math.round(30 * s), Math.round(5 * s) + 1, C.blue, C.cyan);
      crystal(x - 7, GROUND_Y - 1, Math.round(18 * s), Math.round(3 * s) + 1, C.navy, C.blue);
      crystal(x + 6, GROUND_Y - 1, Math.round(14 * s), Math.round(3 * s) + 1, C.mauve, C.salmon);
    }
    g.fillStyle(C.ink).fillRect(0, GROUND_Y, LW, H - GROUND_Y);
    g.fillStyle(C.plum).fillRect(0, GROUND_Y, LW, 1);
    for (let i = 0; i < 24; i++) {
      const x = Math.round(rnd(i, LW)), y = GROUND_Y + 3 + Math.round(rnd(i + 2, 12));
      g.fillStyle(i % 3 ? C.darkBrown : C.blue).fillRect(x, y, 3 + (i % 3), 1);
    }
  },
  near(g) {
    // Big crystals in the corners.
    const big = (x, dir) => {
      for (const [dx, h, w, c] of [[0, 40, 5, C.cyan], [dir * 8, 26, 4, C.blue], [dir * 15, 18, 3, C.mauve]]) {
        for (let y = 0; y < h; y++) {
          const half = Math.max(0, Math.round(w * (1 - y / h)));
          g.fillStyle(c).fillRect(x + dx - half, GROUND_Y + 8 - y, half * 2 + 1, 1);
          g.fillStyle(C.white).fillRect(x + dx - half, GROUND_Y + 8 - y, 1, 1);
        }
      }
    };
    big(6, 1);
    big(LW - 7, -1);
  },
  ambient(scene, add, opts) {
    add(meteor(scene, opts.progress ?? 0));
    for (let i = 0; i < 5; i++) add(spark(scene, i));
    for (let i = 0; i < 6; i++) add(crystalGlow(scene, i));
  }
};

// The meteor in the sky: an integer scale from 1 (zone start) to 4 (boss).
function meteor(scene, progress) {
  const key = 'sky_meteor';
  if (!scene.textures.exists(key)) {
    const g = scene.make.graphics({ add: false });
    for (let i = 0; i < 9; i++) dither(g, 9 + i, 1 + i, 2, 1, C.gold, C.amber); // trail
    disc(g, 6, 6, 5, C.amber);
    disc(g, 6, 6, 4, C.brown);
    disc(g, 5, 5, 2, C.darkBrown);
    g.fillStyle(C.yellow).fillRect(2, 3, 2, 1);
    g.generateTexture(key, 20, 12);
    g.destroy();
  }
  const scale = 1 + Math.min(3, Math.floor(progress * 4));
  const img = scene.add.image(150, 24, key).setOrigin(0.5).setScale(scale).setDepth(0.5);
  return (t) => { img.y = 24 + Math.round(Math.sin(t / 1800) * 1); img.setAlpha(Math.sin(t / 200) > 0.85 ? 0.85 : 1); };
}

function spark(scene, i) {
  const r = scene.add.rectangle(0, 0, 2, 1, i % 2 ? C.gold : C.white).setOrigin(0).setDepth(3);
  const p = { x: 0, y: -10, wait: rnd(i, 3000) };
  return (t, dt) => {
    if (p.wait > 0) { p.wait -= dt; r.setVisible(false); return; }
    r.setVisible(true);
    p.x -= (60 * dt) / 1000;
    p.y += (40 * dt) / 1000;
    if (p.y > GROUND_Y) { p.y = -4; p.x = 80 + rnd(t + i, W); p.wait = 800 + rnd(t * 3 + i, 2500); }
    r.setPosition(Math.round(p.x), Math.round(p.y));
  };
}

// Pulsing light on the crystal tips.
function crystalGlow(scene, i) {
  const x = [24, 70, 128, 196, 248, 300][i] - 8, h = [30, 18, 24, 15, 30, 21][i];
  const r = scene.add.rectangle(x, GROUND_Y - h - 1, 3, 3, C.cyan).setOrigin(0.5).setDepth(3);
  return (t) => r.setAlpha(0.25 + 0.5 * (0.5 + 0.5 * Math.sin(t / 600 + i * 1.3)));
}
