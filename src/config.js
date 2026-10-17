// Base resolution — everything is laid out in these units.
export const W = 320;
export const H = 180;

// Ground line used by side-view scenes.
export const GROUND_Y = 132;

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
