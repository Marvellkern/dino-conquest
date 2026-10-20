import Phaser from 'phaser';
import { W, H, COLORS, setPortrait } from './config.js';
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
import { ZoneIntro } from './scenes/ZoneIntro.js';
import { Daily } from './scenes/Daily.js';
import { fit, wantPortrait } from './systems/screen.js';
import { quickSave } from './systems/runStore.js';
import { fpsOverlay } from './render/fpsOverlay.js';

window.Phaser = Phaser;
setPortrait(wantPortrait()); // pick the layout before the game is sized

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
  scene: [Boot, Title, Home, Hatch, MapScene, Battle, Evolution, RunEnd, Fossil, Nest, ZoneIntro, Daily]
});

// A last save when the tab hides or closes (phones kill background tabs).
document.addEventListener('visibilitychange', () => { if (document.hidden) quickSave(); });
window.addEventListener('pagehide', quickSave);

// Scaling and fullscreen live in systems/screen.js.
const refit = () => fit(game);

// Debugging handle: dev builds, or any build with ?debug in the URL (perf checks).
if (import.meta.env.DEV || new URLSearchParams(location.search).has('debug')) window.__game = game;

game.events.once('ready', refit);
fpsOverlay(game); // ?fps
game.events.on('rescale', () => fit(game, false)); // the render scale changed (render/quality.js)
window.addEventListener('resize', refit);
window.visualViewport?.addEventListener('resize', refit); // phone browser bars sliding in and out
document.addEventListener('fullscreenchange', () => setTimeout(refit, 50));
window.matchMedia?.('(orientation: portrait)').addEventListener?.('change', () => setTimeout(refit, 50)); // rotating the phone
window.addEventListener('orientationchange', () => setTimeout(refit, 150));
