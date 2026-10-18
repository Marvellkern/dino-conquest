import { GRIDS, REX, CROUCH_DROP, crouchGrid } from '../sprites/grids.js';
import { GRIDS2, CROUCH_DROP2, BOSS_SKINS } from '../sprites/grids2.js';
import { PAL } from '../data/palette.js';
import { FX_GRIDS } from '../sprites/fxGrids.js';
import { ICONS } from '../sprites/icons.js';
import { EGG, EGG_STAGES, crackedEgg } from '../sprites/egg.js';
import { SKIN_GRIDS, ALPHA, alphaColor, spikedGrid, shiftedColor, EVO_SHIFT } from '../sprites/skins.js';
import { FORM_ART, buildForm, formColor } from '../sprites/forms.js';
import { RELIC_ICONS, SHOP_ICON } from '../sprites/relicIcons.js';
import { MOVE_ICONS, ICON_SPECIES, speciesIcon } from '../sprites/moveIcons.js';
import { makeSpriteSet, makeTexture } from '../sprites/renderSprite.js';
import { buildRexParts } from '../sprites/rexParts.js';
import { buildFont } from '../ui/font.js';
import { applySettings } from '../systems/meta.js';

const DROP = { ...CROUCH_DROP, ...CROUCH_DROP2 };

// Stand-ins for the Tidal Coast species until their own sprites land (v2.2 step 3):
// an existing body recolored. Each gets a base and an elite (_e1) look.
const STAND_INS = {
  dilo: { from: 'raptor', h: 70, s: 1.1, l: 1 },
  plesio: { from: 'sarco', h: 150, s: 1, l: 1 },
  ichthy: { from: 'compy', h: 140, s: 0.9, l: 1.05 },
  bary: { from: 'spino', h: 35, s: 1, l: 0.95 },
  mosa: { from: 'spino', h: 165, s: 0.8, l: 0.7 }
};

// Generates every texture from code, then hands off.
// URL ?p=<species> jumps straight into a test battle (see Battle.init).
export class Boot extends Phaser.Scene {
  constructor() { super('Boot'); }

  create() {
    buildFont(this);
    applySettings(this.registry);

    // Every species in 3 forms: base, _e1, _e2 (new silhouettes from sprites/forms.js).
    for (const [species, base] of Object.entries({ ...GRIDS, ...GRIDS2 })) {
      this.buildSkin(species, species, base, undefined);
      (FORM_ART[species] ?? []).forEach((art, i) => {
        const { grid, layout, mapRow } = buildForm(base, art);
        this.buildSkin(species, `${species}_e${i + 1}`, grid, formColor(art, i + 1), layout, mapRow(DROP[species] ?? 0));
      });
    }
    // Alpha Rex: the Jungle boss, and a player skin (a goal reward) in all 3 forms.
    this.buildSkin('rex', 'alpharex', spikedGrid(REX, 2), alphaColor);
    FORM_ART.rex.forEach((art, i) => {
      const { grid, layout, mapRow } = buildForm(REX, art), fc = formColor(art, i + 1);
      this.buildSkin('rex', `alpharex_e${i + 1}`, grid, (ch) => ALPHA[ch] ?? fc(ch), layout, mapRow(CROUCH_DROP.rex ?? 0));
    });

    const grids = { ...GRIDS, ...GRIDS2 };
    for (const [key, s] of Object.entries(STAND_INS)) {
      if (grids[key]) continue; // the real sprite exists
      DROP[key] = DROP[s.from];
      this.buildSkin(key, key, grids[s.from], shiftedColor(s));
      const e1 = EVO_SHIFT[1];
      this.buildSkin(key, `${key}_e1`, grids[s.from], shiftedColor({ h: s.h + e1.h, s: s.s * e1.s, l: s.l * e1.l }));
    }

    // Volcano / Meteor Crater bosses: an evolved form in its own palette.
    for (const [key, b] of Object.entries(BOSS_SKINS)) {
      const { grid, layout, mapRow } = buildForm(b.base, FORM_ART[b.species][b.form]);
      this.buildSkin(b.species, key, grid, (ch) => b.colors[ch] ?? PAL[ch], layout, mapRow(DROP[b.species] ?? 0));
    }

    for (const [key, grid] of Object.entries(FX_GRIDS)) makeTexture(this, key, grid);
    for (const [key, grid] of Object.entries(ICONS)) makeTexture(this, key, grid);
    for (const [key, grid] of Object.entries(RELIC_ICONS)) makeTexture(this, `relic_${key}`, grid);
    makeTexture(this, 'icon_shop', SHOP_ICON);
    for (const [key, grid] of Object.entries(MOVE_ICONS)) makeTexture(this, `mi_${key}`, grid);
    for (const sp of ICON_SPECIES) makeTexture(this, `mi_${sp}`, speciesIcon(sp));
    makeTexture(this, 'egg', EGG);
    for (let s = 1; s <= EGG_STAGES; s++) makeTexture(this, `egg_crack${s}`, crackedEgg(s));

    const testBattle = new URLSearchParams(location.search).has('p');
    this.scene.start(testBattle ? 'Battle' : 'Title');
  }

  // Whole sprite (+flash), crouch frame, and T-rex parts when needed.
  buildSkin(species, key, grid, colorOf, layout = {}, crouchRow = DROP[species]) {
    SKIN_GRIDS[key] = grid;
    makeSpriteSet(this, key, grid, colorOf);
    if (species in DROP) makeSpriteSet(this, `${key}_crouch`, crouchGrid(grid, crouchRow), colorOf);
    if (species === 'rex') buildRexParts(this, key, grid, colorOf, layout);
  }
}
