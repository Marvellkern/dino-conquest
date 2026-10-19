// Per-zone lighting (lighting brief §5). Medium / High only; Low keeps the original look.
//   ambient  base light on lit sprites (0xRRGGBB): darker = moodier
//   key      the zone's sun / moon: a big light that sets the rim-light direction. It's placed
//            from the stage, not the screen, so both layouts light the fighters the same:
//            side 'right' | 'left' | 'center', dx px past that edge (or off center), dy px above
//            the ground line (negative = below it)
//   spark    the light a hit throws on both fighters (crits use crit)
// Light2D lights a sprite from its edges (the shader keeps lights near the sprite's plane),
// so the key light reads as a rim; ambient fills the middle.
export const LIGHTING = {
  // Night jungle under a cool moon (the brief's mockup). The ambient stays fairly bright
  // until the baked night backdrop (step 3) darkens the rest of the scene to match.
  jungle: {
    ambient: 0x62768a,
    key: { side: 'right', dx: 16, dy: 150, radius: 520, color: 0x8fb4ff, intensity: 1.6 },
    // Baked night backdrop (render/bake.js): per layer a color grade (rgb multipliers),
    // optional fog (color, amount) and a depth-of-field blur radius in world px.
    bake: {
      sky: { night: { top: 0x070d18, horizon: 0x16323a, moon: { x: 276, y: 24, r: 8, color: 0xe8f0ff, glow: 0x8fb4ff } } },
      far: { grade: [0.34, 0.48, 0.62], fog: [0x1d3b44, 0.4], blur: 2.2 },
      mid: { grade: [0.5, 0.6, 0.74], blur: 0.7, sharpBelow: 129 }, // the ground stays sharp
      near: { grade: [0.36, 0.48, 0.56], blur: 2.2 },
      rays: { shafts: [190, 236, 282], slant: -0.55, width: 18, color: 0xaecbff, alpha: 0.8 },
      fog: { color: 0x9fbccc, alpha: 0.5, y: 104 },
      fireflies: { color: 0xd6ff80, size: 9, lights: 2 }, // lights: real lights (High only)
      shadow: { dx: -0.22, stretch: 1.35 } // cast away from the moon: dx in rig widths
    }
  },
  // Provisional for the other zones until their own pass (step 5): neutral, soft.
  swamp: { ambient: 0x8e9884, key: { side: 'left', dx: 20, dy: 20, radius: 480, color: 0xa8e080, intensity: 0.9 } },
  volcano: { ambient: 0x9a8070, key: { side: 'center', dx: 0, dy: -60, radius: 520, color: 0xffa050, intensity: 1.0 } },
  coast: { ambient: 0x8a94a4, key: { side: 'left', dx: 16, dy: 150, radius: 520, color: 0xd8e4f0, intensity: 1.0 } },
  crater: { ambient: 0x8a7c98, key: { side: 'center', dx: 0, dy: 160, radius: 520, color: 0xfeae34, intensity: 1.0 } }
};

// Hit lights: a warm burst at the impact point, brighter and bigger on a crit.
export const SPARK = {
  hit: { color: 0xffc070, radius: 70, intensity: 1.3, ms: 160 },
  crit: { color: 0xffd8a0, radius: 100, intensity: 2.0, ms: 250 },
  block: { color: 0x9ab8ff, radius: 50, intensity: 0.9, ms: 120 }
};
