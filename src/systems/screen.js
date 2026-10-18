import { W, H, PORTRAIT, setPortrait } from '../config.js';

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

// Portrait when the usable area is clearly taller than wide.
export const wantPortrait = () => { const { w, h } = available(); return h > w * 1.1; };

// Rotating switches the layout right away on calm screens (they are rebuilt from
// state). Anywhere else (a fight, a hatch, an end screen) it waits for the next
// scene, which calls syncLayout() first thing in create().
const SAFE = new Set(['Title', 'Home', 'Nest', 'Map']);
let pending = null;

function switchLayout(game, portrait) {
  setPortrait(portrait);
  game.scale.setGameSize(W, H);
}

export function syncLayout(scene) {
  if (pending !== null && pending !== PORTRAIT) { switchLayout(scene.game, pending); fit(scene.game, false); }
  pending = null;
}

export function fit(game, checkTurn = true) {
  const dpr = window.devicePixelRatio || 1;
  const { w, h } = available();
  const portrait = wantPortrait();
  if (checkTurn && portrait !== PORTRAIT) {
    const active = game.scene.getScenes(true);
    if (active.every((s) => SAFE.has(s.scene.key) && !s.busy && !s.inMenu)) {
      switchLayout(game, portrait);
      pending = null;
      for (const s of active) s.scene.restart(s.sys.settings.data);
    } else pending = portrait;
  }
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
