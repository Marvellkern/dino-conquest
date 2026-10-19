// Per-zone lighting (lighting brief §5). Medium / High only; Low keeps the original look.
//   ambient  base light on lit sprites (0xRRGGBB): darker = moodier
//   key      the zone's sun / moon: a big far light that sets the rim-light direction.
//            x, y are fractions of the screen (1.1 = past the right edge, -0.3 = above it)
//   spark    the light a hit throws on both fighters (crits use crit)
// Light2D lights a sprite from its edges (the shader keeps lights near the sprite's plane),
// so the key light reads as a rim; ambient fills the middle.
export const LIGHTING = {
  // Night jungle under a cool moon (the brief's mockup). The ambient stays fairly bright
  // until the baked night backdrop (step 3) darkens the rest of the scene to match.
  jungle: {
    ambient: 0xb4c0ca,
    key: { x: 1.05, y: -0.35, radius: 560, color: 0x8fb4ff, intensity: 2.2 }
  },
  // Provisional for the other zones until their own pass (step 5): neutral, soft.
  swamp: { ambient: 0x8e9884, key: { x: -0.1, y: 0.4, radius: 480, color: 0xa8e080, intensity: 0.9 } },
  volcano: { ambient: 0x9a8070, key: { x: 0.5, y: 1.4, radius: 520, color: 0xffa050, intensity: 1.0 } },
  coast: { ambient: 0x8a94a4, key: { x: -0.1, y: -0.3, radius: 520, color: 0xd8e4f0, intensity: 1.0 } },
  crater: { ambient: 0x8a7c98, key: { x: 0.5, y: -0.3, radius: 520, color: 0xfeae34, intensity: 1.0 } }
};

// Hit lights: a warm burst at the impact point, brighter and bigger on a crit.
export const SPARK = {
  hit: { color: 0xffc070, radius: 70, intensity: 1.3, ms: 160 },
  crit: { color: 0xffd8a0, radius: 100, intensity: 2.0, ms: 250 },
  block: { color: 0x9ab8ff, radius: 50, intensity: 0.9, ms: 120 }
};
