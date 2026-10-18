// Base resolution — everything is laid out in these units. Two layouts:
// landscape 320x180 and portrait 180x320 (same pixel size on a phone, stood up).
// W / H / GROUND_Y / PORTRAIT are live bindings: setPortrait() switches them,
// so always read them at use time (inside functions), never cache them at module load.
export const LAND = { W: 320, H: 180, GROUND_Y: 132 };
export const PORT = { W: 180, H: 320, GROUND_Y: 196 };

export let W = LAND.W;
export let H = LAND.H;
// Ground line used by side-view scenes.
export let GROUND_Y = LAND.GROUND_Y;
export let PORTRAIT = false;

export function setPortrait(on) {
  PORTRAIT = on;
  ({ W, H, GROUND_Y } = on ? PORT : LAND);
}

// Pick a value per layout: lp(landscapeValue, portraitValue).
export const lp = (land, port) => (PORTRAIT ? port : land);

export const COLORS = {
  bg: '#22262e',
  bgDark: '#121418',
  panel: '#2e333d',
  panelHi: '#4a5161',
  outline: '#0c0e12',
  text: '#f0ecdc',
  textDim: '#8a90a0',
  accent: '#fff096'
};

// Hex string -> 0xRRGGBB number for Phaser tint / fill calls.
export const hex = (s) => parseInt(s.slice(1), 16);
