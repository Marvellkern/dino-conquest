import { LAND } from '../config.js';
import { LW } from '../ui/artKit.js';
import { bakedCanvas } from './bake.js';

const { W, H, GROUND_Y } = LAND;

// Smooth atmosphere pieces for baked (Medium / High) backdrops (lighting brief §6), all
// painted on canvases at the render scale. Sizes and positions are in world px.
const rgba = (c, a) => `rgba(${(c >> 16) & 255},${(c >> 8) & 255},${c & 255},${a})`;

// Night sky: a smooth gradient, a scatter of stars, and the moon (where the key light is).
export function paintNightSky({ top, horizon, moon, stars = 50 }) {
  return (ctx, w, h, rs) => {
    const g = ctx.createLinearGradient(0, 0, 0, GROUND_Y * rs);
    g.addColorStop(0, rgba(top, 1));
    g.addColorStop(1, rgba(horizon, 1));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < stars; i++) {
      const x = ((i * 9301 + 49297) % 233280) / 233280 * w, y = ((i * 4973 + 1931) % 9973) / 9973 * h * 0.45;
      ctx.fillStyle = rgba(0xdbe6ff, 0.25 + (i % 5) * 0.12);
      ctx.fillRect(Math.round(x), Math.round(y), rs, rs);
    }
    if (moon) {
      const mx = moon.x * rs, my = moon.y * rs, r = moon.r * rs;
      const halo = ctx.createRadialGradient(mx, my, r * 0.8, mx, my, r * 6);
      halo.addColorStop(0, rgba(moon.glow, 0.45));
      halo.addColorStop(1, rgba(moon.glow, 0));
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = rgba(moon.color, 1);
      ctx.beginPath(); ctx.arc(mx, my, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = rgba(moon.glow, 0.35); // a few soft craters
      for (const [dx, dy, s] of [[-0.3, -0.2, 0.25], [0.25, 0.15, 0.18], [-0.05, 0.35, 0.14]]) {
        ctx.beginPath(); ctx.arc(mx + dx * r, my + dy * r, s * r, 0, Math.PI * 2); ctx.fill();
      }
    }
  };
}

// God rays: soft shafts slanting away from the light, brightest a third of the way down,
// gone at the ground. shafts: x positions along the top edge; slant: x travelled per px down
// (negative = toward the left, for a light on the right).
export function godRays(scene, zone, { shafts, slant = -0.5, color, width = 16 }) {
  return bakedCanvas(scene, zone, 'rays', LW, H, (ctx, w, h, rs) => {
    for (const x0 of shafts) {
      const run = slant * GROUND_Y;
      for (let f = 3; f >= 1; f--) { // feathered: wide and faint, then narrower and stronger
        const half = (width * f) / 3 / 2;
        const g = ctx.createLinearGradient(0, 0, 0, GROUND_Y * rs);
        g.addColorStop(0, rgba(color, 0));
        g.addColorStop(0.35, rgba(color, 0.14 / f));
        g.addColorStop(1, rgba(color, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo((x0 - half) * rs, 0);
        ctx.lineTo((x0 + half) * rs, 0);
        ctx.lineTo((x0 + half * 2.2 + run) * rs, GROUND_Y * rs);
        ctx.lineTo((x0 - half * 2.2 + run) * rs, GROUND_Y * rs);
        ctx.closePath();
        ctx.fill();
      }
    }
  });
}

// A soft band of mist along the ground, twice the screen wide so it can drift and wrap.
export function fogBand(scene, zone, { color, height = 34 }) {
  return bakedCanvas(scene, zone, 'fog', W * 2, height, (ctx, w, h, rs) => {
    for (let i = 0; i < 46; i++) {
      const x = (((i * 7919) % 1000) / 1000) * w, y = h * (0.45 + (((i * 131) % 100) / 100 - 0.5) * 0.4), r = (10 + (i % 7) * 4) * rs;
      for (const off of [0, w]) { // the copy one width over makes the wrap seamless
        const g = ctx.createRadialGradient(x - off, y, 0, x - off, y, r);
        g.addColorStop(0, rgba(color, 0.16));
        g.addColorStop(1, rgba(color, 0));
        ctx.fillStyle = g;
        ctx.fillRect(x - off - r, y - r, r * 2, r * 2);
      }
    }
  });
}

// Shared soft textures: a round glow (fireflies, embers) and a blurred ground shadow.
export const glowTexture = (scene) => bakedCanvas(scene, 'shared', 'glow', 16, 16, (ctx, w, h) => {
  const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.45)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
});

export const shadowTexture = (scene) => bakedCanvas(scene, 'shared', 'shadow', 32, 8, (ctx, w, h) => {
  ctx.save();
  ctx.scale(1, h / w); // an ellipse: a circle squashed flat
  const g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  g.addColorStop(0, 'rgba(12,10,20,0.75)');
  g.addColorStop(0.6, 'rgba(12,10,20,0.35)');
  g.addColorStop(1, 'rgba(12,10,20,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, w);
  ctx.restore();
});
