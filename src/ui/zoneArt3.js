import { LAND } from '../config.js';
import { E32 as C } from '../data/palette.js';
import { LW, rnd, dither, bands, disc } from './artKit.js';

const { W, H, GROUND_Y } = LAND; // drawn in landscape units (see zoneArt.js)

// Tidal Coast backdrop (same layer contract as ui/zoneArt.js): a stormy dusk sky with
// a pale sun, sea stacks and a cliff line, rolling waves over wet black rocks, tide
// pools and driftwood up front. Ambient: wave crests (3-frame loop), shore foam,
// gulls, sea spray, a wave washing over the foreground every ~8s; in boss fights rain,
// and the tide rises when the boss hits phase 2 (backdrop.onPhase).

const HORIZON = 80, SHORE = GROUND_Y - 4;

export const COAST = {
  sky(g) {
    bands(g, [C.night, C.dusk, C.slate, C.steel], 0, HORIZON);
    disc(g, 226, 40, 10, C.silver); // the pale sun
    disc(g, 226, 40, 7, C.sand);
    for (const [y, x0, w, c] of [[30, 150, 140, C.slate], [37, 200, 110, C.dusk], [46, 120, 160, C.slate], [56, 0, 120, C.dusk], [22, 20, 90, C.dusk]]) {
      dither(g, x0, y, w, 3, c, C.steel); // cloud banks drifting over it
      g.fillStyle(c).fillRect(x0 + 6, y + 3, w - 12, 1);
    }
  },
  far(g) {
    // The sea to the horizon, a cliff line on the left, sea stacks out in the water.
    bands(g, [C.dusk, C.night, C.night], HORIZON, GROUND_Y);
    g.fillStyle(C.steel).fillRect(0, HORIZON, LW, 1);
    for (let x = 0; x < 110; x++) {
      const h = Math.max(0, 46 - Math.round(x * 0.35) + Math.round(Math.sin(x / 7) * 3));
      g.fillStyle(C.ink).fillRect(x, HORIZON - h, 1, h + 8);
      g.fillStyle(C.dusk).fillRect(x, HORIZON - h, 1, 1);
    }
    for (const [x, w, h] of [[150, 8, 30], [166, 5, 18], [268, 10, 38], [284, 4, 14]]) {
      for (let y = 0; y < h; y++) {
        const half = Math.round((w / 2) * (0.6 + 0.4 * (y / h)));
        g.fillStyle(C.ink).fillRect(x - half, HORIZON - h + y, half * 2, 1);
        g.fillStyle(C.slate).fillRect(x - half, HORIZON - h + y, 1, 1);
      }
      g.fillStyle(C.steel).fillRect(x - w / 2 - 2, HORIZON + 1, w + 4, 1); // surf at the base
    }
  },
  mid(g) {
    // Nearer, choppier water, the shoreline, then wet sand.
    dither(g, 0, 112, LW, SHORE - 112, C.night, C.navy);
    g.fillStyle(C.navy).fillRect(0, SHORE - 3, LW, 3);
    // Wet black rocks along the waterline, with a glint of wet light.
    for (const [x, w, h] of [[14, 22, 16], [44, 10, 8], [118, 14, 9], [236, 24, 18], [300, 16, 11]]) {
      for (let y = 0; y < h; y++) {
        const half = Math.round((w / 2) * Math.sqrt(1 - ((h - y) / h) ** 2 * 0.7));
        g.fillStyle(C.ink).fillRect(x - half, SHORE - h + y + 2, half * 2, 1);
      }
      g.fillStyle(C.dusk).fillRect(x - Math.round(w / 4), SHORE - h + 3, Math.round(w / 3), 1);
      g.fillStyle(C.silver).fillRect(x - Math.round(w / 5), SHORE - h + 4, 1, 1);
    }
    // Wet sand at the waterline, drier sand below, scattered shells and pebbles.
    dither(g, 0, SHORE, LW, GROUND_Y - SHORE, C.brown, C.clay);
    g.fillStyle(C.clay).fillRect(0, GROUND_Y, LW, H - GROUND_Y);
    g.fillStyle(C.leather).fillRect(0, GROUND_Y, LW, 1);
    for (let i = 0; i < 30; i++) {
      const x = Math.round(rnd(i, LW)), y = GROUND_Y + 3 + Math.round(rnd(i + 5, H - GROUND_Y - 6));
      g.fillStyle(i % 4 === 0 ? C.peach : i % 4 === 1 ? C.salmon : C.brown).fillRect(x, y, i % 3 ? 1 : 2, 1);
    }
  },
  near(g) {
    // Left: driftwood and a tide pool. Right: kelp on a rock and another pool.
    const pool = (cx, cy, rx) => {
      for (let dy = -2; dy <= 2; dy++) {
        const w = Math.round(rx * Math.sqrt(1 - (dy / 3) ** 2));
        g.fillStyle(C.ink).fillRect(cx - w - 1, cy + dy, w * 2 + 2, 1);
        g.fillStyle(dy < 0 ? C.navy : C.deepTeal).fillRect(cx - w, cy + dy, w * 2, 1);
      }
      g.fillStyle(C.silver).fillRect(cx - 2, cy - 1, 3, 1);
    };
    pool(26, H - 14, 12);
    pool(LW - 30, H - 10, 9);
    for (let x = 0; x < 34; x++) { // driftwood log
      const y = H - 28 + Math.round(x * 0.12);
      g.fillStyle(C.ink).fillRect(x, y - 1, 1, 6);
      g.fillStyle(C.brown).fillRect(x, y, 1, 4);
      g.fillStyle(x % 5 ? C.leather : C.peach).fillRect(x, y, 1, 1);
    }
    for (let i = 0; i < 4; i++) { // kelp
      const x0 = LW - 6 - i * 4;
      for (let y = 0; y < 22 + i * 4; y++) {
        const x = x0 + Math.round(Math.sin(y / 4 + i) * 1.5);
        g.fillStyle(i % 2 ? C.pine : C.forest).fillRect(x, H - 6 - y, 2, 1);
      }
    }
    g.fillStyle(C.ink).fillRect(LW - 24, H - 6, 24, 6); // the kelp's rock
    g.fillStyle(C.dusk).fillRect(LW - 22, H - 6, 18, 1);
    for (const [x, c] of [[60, C.salmon], [64, C.peach], [LW - 50, C.sand]]) g.fillStyle(c).fillRect(x, H - 4, 2, 1).fillRect(x, H - 5, 1, 1); // shells
  },
  ambient(scene, add, opts) {
    for (let i = 0; i < 3; i++) add(crests(scene, i));
    add(shoreFoam(scene));
    for (let i = 0; i < 3; i++) add(gull(scene, i));
    for (let i = 0; i < 2; i++) add(spray(scene, i));
    if (opts.front) add(washOver(scene, opts.front));
    if (opts.boss && opts.front) add(rain(scene, opts.front));
    if (opts.front && opts.bd) add(tide(scene, opts.front, opts.bd));
  }
};

// Wave crests: a row of foam dashes with 3 frames cycling, so the sea rolls.
function crests(scene, row) {
  const keys = [0, 1, 2].map((f) => {
    const key = `coast_crest${row}_${f}`;
    if (!scene.textures.exists(key)) {
      const g = scene.make.graphics({ add: false });
      for (let i = 0; i < 14 + row * 4; i++) { // scattered, uneven caps (not a dashed line)
        const x = Math.round(rnd(i * 3 + row * 17, W + 16) + f * 2) % (W + 16), y = Math.round(rnd(i + row * 5, 3));
        const len = 1 + Math.round(rnd(i * 7 + row, 3)) + (f === 1 ? 1 : 0);
        g.fillStyle(f === 2 ? C.steel : C.silver).fillRect(x, y, len, 1);
        if (f === 1 && len > 2) g.fillStyle(C.white).fillRect(x + 1, y, 1, 1);
        if (len > 2) g.fillStyle(C.slate).fillRect(x + 1, y + 1, len - 1, 1); // the wave's dark face
      }
      g.generateTexture(key, W + 16, 4);
      g.destroy();
    }
    return key;
  });
  const img = scene.add.image(-8, [88, 101, 116][row], keys[0]).setOrigin(0).setDepth(2.5).setAlpha(0.45 + row * 0.15);
  return (t) => img.setTexture(keys[Math.floor(t / 260 + row) % 3]);
}

// Foam along the shoreline, washing in and out.
function shoreFoam(scene) {
  const r = scene.add.rectangle(0, SHORE, W + 16, 1, C.silver).setOrigin(0).setDepth(2.5);
  const r2 = scene.add.rectangle(0, SHORE + 1, W + 16, 1, C.steel).setOrigin(0).setDepth(2.5).setAlpha(0.6);
  return (t) => {
    const k = Math.sin(t / 900);
    r.y = SHORE + Math.round(k * 1.5);
    r2.y = r.y + 1;
    r2.setAlpha(0.3 + 0.3 * (k + 1));
  };
}

// A tiny gull (3px) gliding, wings flapping now and then.
function gull(scene, i) {
  const body = scene.add.rectangle(0, 0, 1, 1, C.white).setOrigin(0).setDepth(0.6);
  const wl = scene.add.rectangle(0, 0, 1, 1, C.silver).setOrigin(0).setDepth(0.6);
  const wr = scene.add.rectangle(0, 0, 1, 1, C.silver).setOrigin(0).setDepth(0.6);
  const ph = i * 2.1;
  return (t) => {
    const x = Math.round(((t / (40 + i * 12) + i * 90) % (W + 40)) - 20), y = Math.round(28 + i * 14 + Math.sin(t / 900 + ph) * 4);
    const up = Math.floor(t / 180 + i) % 4 === 0;
    body.setPosition(x, y);
    wl.setPosition(x - 1, y + (up ? -1 : 0));
    wr.setPosition(x + 1, y + (up ? -1 : 0));
  };
}

// Sea spray bursting off the rocks.
function spray(scene, i) {
  const rock = [[236, SHORE - 16], [14, SHORE - 14]][i];
  const dots = Array.from({ length: 6 }, (_, k) => scene.add.rectangle(0, 0, 1, 1, k % 2 ? C.white : C.silver).setOrigin(0).setDepth(2.6).setVisible(false));
  const period = 3200 + i * 1700;
  return (t) => {
    const k = ((t + i * 900) % period) / 700; // a burst lasts 700ms of each period
    dots.forEach((d, j) => {
      if (k > 1) { d.setVisible(false); return; }
      const ang = -Math.PI / 2 + (j - 2.5) * 0.35;
      d.setVisible(true).setPosition(Math.round(rock[0] + Math.cos(ang) * k * 14), Math.round(rock[1] + Math.sin(ang) * k * 12 + k * k * 8));
      d.setAlpha(1 - k);
    });
  };
}

// Every ~8s a wave washes over the foreground, then drains back.
function washOver(scene, front) {
  const sheet = scene.add.rectangle(0, 0, W + 40, 18, C.blue, 0.3).setOrigin(0);
  const foam = scene.add.rectangle(0, 0, W + 40, 1, C.white, 0.8).setOrigin(0);
  front.add([sheet, foam]);
  const period = 8000, run = 1800;
  return (t) => {
    const k = (t % period) / run;
    const on = k < 1;
    sheet.setVisible(on); foam.setVisible(on);
    if (!on) return;
    const x = Math.round(-W - 40 + k * (W * 2 + 40)), y = H - 6 - Math.round(Math.sin(k * Math.PI) * 10);
    sheet.setPosition(x, y); foam.setPosition(x, y);
    sheet.setAlpha(0.3 * Math.sin(k * Math.PI));
  };
}

// Boss fight: rain streaks slanting across everything.
function rain(scene, front) {
  const drops = Array.from({ length: 40 }, (_, i) => {
    const d = scene.add.rectangle(0, 0, 1, 3, C.silver, 0.45).setOrigin(0);
    front.add(d);
    return { d, x: rnd(i, W + 20), y: rnd(i + 7, H), v: 160 + rnd(i + 3, 60) };
  });
  return (t, dt) => {
    for (const p of drops) {
      p.y += (p.v * dt) / 1000;
      p.x -= (p.v * 0.3 * dt) / 1000;
      if (p.y > H) { p.y = -4; p.x = rnd(t + p.v, W + 40); }
      p.d.setPosition(Math.round(p.x), Math.round(p.y));
    }
  };
}

// Phase 2 of the boss: the tide climbs over the dinos' feet and stays.
function tide(scene, front, bd) {
  const water = scene.add.rectangle(-10, GROUND_Y, W + 40, H - GROUND_Y + 10, C.navy, 0.45).setOrigin(0).setVisible(false);
  const edge = scene.add.rectangle(-10, GROUND_Y, W + 40, 1, C.silver, 0.8).setOrigin(0).setVisible(false);
  front.add([water, edge]);
  let level = 0, target = 0;
  bd.onPhase = () => { target = 10; }; // px above the ground line
  return (t, dt) => {
    if (level < target) level = Math.min(target, level + dt / 200);
    if (!level) return;
    const y = GROUND_Y - Math.round(level) + Math.round(Math.sin(t / 500));
    water.setVisible(true).setY(y);
    edge.setVisible(true).setY(y);
  };
}
