import Phaser from 'phaser';
import { W, H, COLORS } from './config.js';
import { Boot } from './scenes/Boot.js';
import { Battle } from './scenes/Battle.js';
import { Title } from './scenes/Title.js';
import { Home } from './scenes/Home.js';
import { Hatch } from './scenes/Hatch.js';
import { MapScene } from './scenes/Map.js';
import { Evolution } from './scenes/Evolution.js';
import { RunEnd } from './scenes/RunEnd.js';
import { Fossil } from './scenes/Fossil.js';
import { Nest } from './scenes/Nest.js';

window.Phaser = Phaser;

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: W,
  height: H,
  backgroundColor: COLORS.bgDark,
  pixelArt: true,
  roundPixels: true,
  scale: { mode: Phaser.Scale.NONE, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { activePointers: 2 },
  audio: { noAudio: true }, // SFX are our own WebAudio synth (systems/sfx.js)
  scene: [Boot, Title, Home, Hatch, MapScene, Battle, Evolution, RunEnd, Fossil, Nest]
});

// Integer scaling in *device* pixels, so every game pixel maps to an exact
// NxN block of screen pixels (crisp on high-DPI screens too). Letterboxed.
function fit() {
  const dpr = window.devicePixelRatio || 1;
  const z = Math.max(1, Math.floor(Math.min((innerWidth * dpr) / W, (innerHeight * dpr) / H)));
  game.scale.setZoom(z / dpr);
  game.registry.set('zoom', z);
  game.events.emit('zoom', z);
}

if (import.meta.env.DEV) window.__game = game; // debugging handle, dev builds only

game.events.once('ready', fit);
window.addEventListener('resize', fit);
