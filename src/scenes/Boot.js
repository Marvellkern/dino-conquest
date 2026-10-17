import { GRIDS, REX, CROUCH_DROP, crouchGrid } from '../sprites/grids.js';
import { FX_GRIDS } from '../sprites/fxGrids.js';
import { ICONS } from '../sprites/icons.js';
import { EGG, EGG_STAGES, crackedEgg } from '../sprites/egg.js';
import { EVO_SHIFT, EVO_SPIKE_EVERY, SKIN_GRIDS, shiftedColor, alphaColor, spikedGrid } from '../sprites/skins.js';
import { makeSpriteSet, makeTexture } from '../sprites/renderSprite.js';
import { buildRexParts } from '../sprites/rexParts.js';
import { buildFont } from '../ui/font.js';
import { applySettings } from '../systems/meta.js';

// Generates every texture from code, then hands off.
// URL ?p=<species> jumps straight into a test battle (see Battle.init).
export class Boot extends Phaser.Scene {
  constructor() { super('Boot'); }

  create() {
    buildFont(this);
    applySettings(this.registry);

    // Every species in 3 stages: base, _e1, _e2 (recolored + spiked).
    for (const [species, base] of Object.entries(GRIDS)) {
      for (let e = 0; e < EVO_SHIFT.length; e++) {
        const key = e ? `${species}_e${e}` : species;
        const grid = e ? spikedGrid(base, EVO_SPIKE_EVERY[e]) : base;
        this.buildSkin(species, key, grid, e ? shiftedColor(EVO_SHIFT[e]) : undefined);
      }
    }
    this.buildSkin('rex', 'alpharex', spikedGrid(REX, 2), alphaColor);

    for (const [key, grid] of Object.entries(FX_GRIDS)) makeTexture(this, key, grid);
    for (const [key, grid] of Object.entries(ICONS)) makeTexture(this, key, grid);
    makeTexture(this, 'egg', EGG);
    for (let s = 1; s <= EGG_STAGES; s++) makeTexture(this, `egg_crack${s}`, crackedEgg(s));

    const testBattle = new URLSearchParams(location.search).has('p');
    this.scene.start(testBattle ? 'Battle' : 'Title');
  }

  // Whole sprite (+flash), crouch frame, and T-rex parts when needed.
  buildSkin(species, key, grid, colorOf) {
    SKIN_GRIDS[key] = grid;
    makeSpriteSet(this, key, grid, colorOf);
    if (species in CROUCH_DROP) makeSpriteSet(this, `${key}_crouch`, crouchGrid(grid, CROUCH_DROP[species]), colorOf);
    if (species === 'rex') buildRexParts(this, key, grid, colorOf);
  }
}
