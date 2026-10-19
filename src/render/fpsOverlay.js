import { render } from './quality.js';

// Dev FPS overlay: add ?fps to the URL. Shows fps, the graphics tier, render scale and
// active real lights, refreshed twice a second. Plain DOM, so it costs the game nothing.
export function fpsOverlay(game) {
  if (!new URLSearchParams(location.search).has('fps')) return;
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;left:4px;top:4px;z-index:99;font:11px monospace;color:#fff096;'
    + 'background:rgba(12,14,18,.75);padding:2px 5px;pointer-events:none;white-space:pre';
  document.body.appendChild(el);
  setInterval(() => {
    el.textContent = `${Math.round(game.loop.actualFps)} FPS  ${render.tier.toUpperCase()}  x${render.rs}  LIGHTS ${render.lights}`;
  }, 500);
}
