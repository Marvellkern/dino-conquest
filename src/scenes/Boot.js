import { GRIDS, REX, CROUCH_DROP, crouchGrid } from '../sprites/grids.js';
import { FX_GRIDS } from '../sprites/fxGrids.js';
import { ICONS } from '../sprites/icons.js';
import { EGG, EGG_STAGES, crackedEgg } from '../sprites/egg.js';
import { SKIN_GRIDS, ALPHA, alphaColor, spikedGrid } from '../sprites/skins.js';
import { FORM_ART, buildForm, formColor } from '../sprites/forms.js';
import { RELIC_ICONS, SHOP_ICON } from '../sprites/relicIcons.js';
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

    // Every species in 3 forms: base, _e1, _e2 (new silhouettes from sprites/forms.js).
    for (const [species, base] of Object.entries(GRIDS)) {
      this.buildSkin(species, species, base, undefined);
      (FORM_ART[species] ?? []).forEach((art, i) => {
        const { grid, layout, mapRow } = buildForm(base, art);
        this.buildSkin(species, `${species}_e${i + 1}`, grid, formColor(art, i + 1), layout, mapRow(CROUCH_DROP[species] ?? 0));
      });
    }
    // Alpha Rex: the Jungle boss, and a player skin (a goal reward) in all 3 forms.
    this.buildSkin('rex', 'alpharex', spikedGrid(REX, 2), alphaColor);
    FORM_ART.rex.forEach((art, i) => {
      const { grid, layout, mapRow } = buildForm(REX, art), fc = formColor(art, i + 1);
      this.buildSkin('rex', `alpharex_e${i + 1}`, grid, (ch) => ALPHA[ch] ?? fc(ch), layout, mapRow(CROUCH_DROP.rex ?? 0));
    });

    for (const [key, grid] of Object.entries(FX_GRIDS)) makeTexture(this, key, grid);
    for (const [key, grid] of Object.entries(ICONS)) makeTexture(this, key, grid);
    for (const [key, grid] of Object.entries(RELIC_ICONS)) makeTexture(this, `relic_${key}`, grid);
    makeTexture(this, 'icon_shop', SHOP_ICON);
    makeTexture(this, 'egg', EGG);
    for (let s = 1; s <= EGG_STAGES; s++) makeTexture(this, `egg_crack${s}`, crackedEgg(s));

    const testBattle = new URLSearchParams(location.search).has('p');
    this.scene.start(testBattle ? 'Battle' : 'Title');
  }

  // Whole sprite (+flash), crouch frame, and T-rex parts when needed.
  buildSkin(species, key, grid, colorOf, layout = {}, crouchRow = CROUCH_DROP[species]) {
    SKIN_GRIDS[key] = grid;
    makeSpriteSet(this, key, grid, colorOf);
    if (species in CROUCH_DROP) makeSpriteSet(this, `${key}_crouch`, crouchGrid(grid, crouchRow), colorOf);
    if (species === 'rex') buildRexParts(this, key, grid, colorOf, layout);
  }
}
