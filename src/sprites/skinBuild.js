import { PAL } from '../data/palette.js';
import { CROUCH_DROP, crouchGrid } from './grids.js';
import { CROUCH_DROP2 } from './grids2.js';
import { CROUCH_DROP3 } from './grids3.js';
import { SKIN_GRIDS } from './skins.js';
import { makeSpriteSet } from './renderSprite.js';
import { buildRexParts } from './rexParts.js';
import { variantColor } from './variantArt.js';

export const DROP = { ...CROUCH_DROP, ...CROUCH_DROP2, ...CROUCH_DROP3 };

// How each skin was built (Boot), so variants can be built from it later.
const SPECS = {};

// Whole sprite (+flash), crouch frame, and T-rex parts when needed.
export function buildSkin(scene, species, key, grid, colorOf = (ch) => PAL[ch], layout = {}, crouchRow = DROP[species]) {
  SKIN_GRIDS[key] = grid;
  SPECS[key] = { species, grid, colorOf, layout, crouchRow };
  makeSpriteSet(scene, key, grid, colorOf);
  if (species in DROP) makeSpriteSet(scene, `${key}_crouch`, crouchGrid(grid, crouchRow), colorOf);
  if (species === 'rex') buildRexParts(scene, key, grid, colorOf, layout);
}

// Variant skins ('rex~magma', 'rex~magma_e2': run/run.js skinOf) are built the first time
// something draws them: 13 species x 6 variants x 3 forms is too many to make at boot.
// Returns a key that exists (the plain species if the skin can't be made).
const VARIANT_KEY = /^([a-z]+)~([a-z]+)(_e\d)?$/;
export function ensureSkin(scene, key) {
  if (scene.textures.exists(key)) return key;
  const m = VARIANT_KEY.exec(key);
  const spec = m && SPECS[m[1] + (m[3] ?? '')];
  if (!spec) return m ? m[1] : key;
  buildSkin(scene, spec.species, key, spec.grid, variantColor(m[2], spec.colorOf), spec.layout, spec.crouchRow);
  return key;
}
