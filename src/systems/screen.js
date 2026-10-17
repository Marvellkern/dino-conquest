import { W, H } from '../config.js';

// Screen fitting and fullscreen.
//
// Desktop: integer scaling in device pixels, so every game pixel is an exact
// NxN block (crisp). Phones: whole-number steps can leave a third of the
// screen black (5.5x rounds down to 5x), so on high-DPI screens we allow a
// fractional scale: always at 2x+ density, and at 1.5x when the integer
// one would waste more than 10%. The uneven rows can't be seen there.
// The notch / home bar (safe-area insets) is kept clear via the #safe probe.

export const isPhone = () => window.matchMedia?.('(pointer: coarse)').matches ?? false;

function available() {
  const r = document.getElementById('safe')?.getBoundingClientRect();
  return r && r.width > 0 ? { w: r.width, h: r.height } : { w: innerWidth, h: innerHeight };
}

export function fit(game) {
  const dpr = window.devicePixelRatio || 1;
  const { w, h } = available();
  const exact = Math.min((w * dpr) / W, (h * dpr) / H);
  let z = Math.max(1, Math.floor(exact));
  if (dpr >= 2 || (dpr >= 1.5 && z < exact * 0.9)) z = exact; // phones: always fill
  game.scale.setZoom(z / dpr);
  game.registry.set('zoom', z);
  game.events.emit('zoom', z);
}

export const canFullscreen = () => !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
export const isFullscreen = () => !!(document.fullscreenElement || document.webkitFullscreenElement);

// Must run inside a tap / click handler. Also asks for landscape where allowed (Android).
export function enterFullscreen() {
  if (!canFullscreen() || isFullscreen()) return;
  const el = document.documentElement;
  const req = el.requestFullscreen?.bind(el) ?? el.webkitRequestFullscreen?.bind(el);
  Promise.resolve(req?.({ navigationUI: 'hide' }))
    .then(() => screen.orientation?.lock?.('landscape'))
    .catch(() => {}); // refused or unsupported: keep playing in the page
}

export function exitFullscreen() {
  if (!isFullscreen()) return;
  (document.exitFullscreen ?? document.webkitExitFullscreen)?.call(document)?.catch?.(() => {});
}
