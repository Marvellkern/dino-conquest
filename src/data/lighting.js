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
  // The other zones (step 5). Extra bake keys, read by render/zoneLights.js:
  //   emitters  real lights at fixed spots (lava, crystals, fungi): x, y in landscape art units,
  //             color, radius, intensity, flicker (0-1 random wobble) or pulse (slow sine);
  //             each also gets a baked glow pool on the ground under it. Extras beyond the
  //             tier's light cap just keep their glow pool.
  //   glows     drifting glow sprites (not real lights): kind rise | drift | twinkle, count,
  //             color, size, area [x0, y0, x1, y1]
  //   fog       one band or a list of { y, alpha, color, speed }
  //   rays      shafts: x positions (or [x, slant] pairs)
  //   lightning { every: [min, max] ms }: the whole scene flashes for a moment (never during a QTE)
  //   keyPulse  { amount, ms }: the key light breathes; keyByProgress: brighter near the boss
  swamp: {
    ambient: 0x56634c, // murky olive
    key: { side: 'left', dx: 10, dy: 44, radius: 560, color: 0x8cc870, intensity: 1.4 }, // sickly glow off the water, low-left: high enough to skim their sides
    bake: {
      sky: { grade: [0.52, 0.6, 0.52], fog: [0x3e4a38, 0.25] },
      far: { grade: [0.46, 0.54, 0.48], fog: [0x4a5a44, 0.45], blur: 2.4 },
      mid: { grade: [0.58, 0.66, 0.58], blur: 0.7, sharpBelow: 129 },
      near: { grade: [0.4, 0.48, 0.4], blur: 2.4 },
      fog: [{ y: 92, alpha: 0.55, color: 0xa8b898, speed: 70 }, { y: 112, alpha: 0.45, color: 0x93a888, speed: 120 }],
      emitters: [ // glowing fungi on the mangrove roots
        { x: 24, y: 96, color: 0x7dff9a, radius: 60, intensity: 1.0, pulse: 0.3 },
        { x: 198, y: 100, color: 0x9affc0, radius: 60, intensity: 1.0, pulse: 0.3 },
        { x: 104, y: 98, color: 0x7dff9a, radius: 55, intensity: 0.9, pulse: 0.3 },
        { x: 280, y: 102, color: 0x9affc0, radius: 55, intensity: 0.9, pulse: 0.3 }
      ],
      fungi: true, // draw the caps the emitters sit on
      glows: { kind: 'drift', count: 10, color: 0xb8ff90, size: 6, area: [0, 50, 336, 128] }, // spores
      shadow: { dx: 0.18, stretch: 1.3 }
    }
  },
  volcano: {
    ambient: 0x6a4a40, // dark red-brown
    key: { side: 'center', dx: 0, dy: -60, radius: 440, color: 0xff8a3a, intensity: 1.1 }, // lava glow from below
    bake: {
      sky: { grade: [0.72, 0.56, 0.52] },
      far: { grade: [0.6, 0.46, 0.44], fog: [0x3e2731, 0.35], blur: 2.2 },
      mid: { grade: [0.72, 0.6, 0.56], blur: 0.7, sharpBelow: 129 },
      near: { grade: [0.5, 0.4, 0.38], blur: 2.4 },
      keyPulse: { amount: 0.18, ms: 2600 },
      emitters: [ // the lava falls
        { x: 37, y: 112, color: 0xff7a2a, radius: 90, intensity: 1.4, flicker: 0.25 },
        { x: 287, y: 112, color: 0xff7a2a, radius: 90, intensity: 1.4, flicker: 0.25 },
        { x: 83, y: 112, color: 0xff8a3a, radius: 80, intensity: 1.2, flicker: 0.25 }
      ],
      glows: { kind: 'rise', count: 12, color: 0xff9a40, size: 5, area: [0, 40, 336, 132] }, // embers
      shadow: { dx: 0, stretch: 1.15 }
    }
  },
  coast: {
    ambient: 0x58636f, // stormy blue-grey (a bit darker, so the sun's rim reads)
    key: { side: 'center', dx: 58, dy: 92, radius: 520, color: 0xe4ecf6, intensity: 1.8 }, // the pale sun in the art (226, 40): rims both fighters' facing sides
    bake: {
      sky: { grade: [0.72, 0.78, 0.9] },
      far: { grade: [0.6, 0.66, 0.78], fog: [0x5a6988, 0.35], blur: 2.2 },
      mid: { grade: [0.7, 0.75, 0.86], blur: 0.7, sharpBelow: 129 },
      near: { grade: [0.5, 0.55, 0.66], blur: 2.4 },
      rays: { shafts: [[196, -0.3], [226, 0], [256, 0.3]], width: 18, color: 0xe8f0ff, alpha: 0.55 }, // fanning down from the sun
      lightning: { every: [10000, 15000] },
      shadow: { dx: -0.12, stretch: 1.3 } // the sun is high and a little right
    }
  },
  crater: {
    ambient: 0x463a5c, // purple-black
    key: { side: 'center', dx: -10, dy: 140, radius: 520, color: 0xfeae34, intensity: 1.2 }, // the meteor
    bake: {
      sky: { grade: [0.78, 0.68, 0.88] },
      far: { grade: [0.56, 0.5, 0.72], fog: [0x262b44, 0.3], blur: 2.2 },
      mid: { grade: [0.72, 0.64, 0.84], blur: 0.7, sharpBelow: 129 },
      near: { grade: [0.52, 0.46, 0.62], blur: 2.4 },
      keyByProgress: [0.9, 2.2], // intensity at the zone's first column -> at the boss
      rays: { shafts: [[124, -0.25], [150, 0], [176, 0.25]], width: 16, color: 0xffd090, alpha: 0.5 },
      emitters: [ // the bigger crystal clusters
        { x: 24, y: 104, color: 0x2ce8f5, radius: 70, intensity: 1.1, pulse: 0.35 },
        { x: 248, y: 104, color: 0x2ce8f5, radius: 70, intensity: 1.1, pulse: 0.35 },
        { x: 128, y: 110, color: 0x7ad8ff, radius: 60, intensity: 0.9, pulse: 0.35 },
        { x: 300, y: 112, color: 0xb070ff, radius: 55, intensity: 0.9, pulse: 0.35 }
      ],
      glows: { kind: 'twinkle', count: 10, color: 0x9ae8ff, size: 5, area: [0, 30, 336, 128] },
      shadow: { dx: 0.05, stretch: 1.2 }
    }
  }
};

// Special moves throw a colored flash at the hit (poison green, fire orange, crystal cyan...);
// sky: a light from above when the move starts (Starfall).
export const MOVE_LIGHTS = {
  venomSpit: { color: 0x7dff6a }, thagomizer: { color: 0x7dff6a }, spitBlind: { color: 0x9a6aff },
  magmaTail: { color: 0xff6a2a }, hornRam: { color: 0xffa040 }, hornCharge: { color: 0xffa040 }, goreCharge: { color: 0xff5040 },
  crushingBite: { color: 0xfff0d0 }, primalChomp: { color: 0xff5a40 }, deathRoll: { color: 0x5ad8c0 }, swampSurge: { color: 0x5ad8a0 },
  bogSurge: { color: 0x5ad8a0 }, scytheClaws: { color: 0xd8e0ff }, diveBomb: { color: 0xe8f0ff }, clubSmash: { color: 0xffd060 },
  goreRush: { color: 0xff5040 }, skullBash: { color: 0xfff0d0 }, breach: { color: 0x8ae8ff },
  starfall: { color: 0xd8e8ff, sky: { radius: 300, intensity: 2.6, ms: 700 } }
};

// Boss and Roar moments (render/lighting.js): the ambient shifts for a moment.
export const MOMENTS = {
  roar: { mult: 0.7, ms: 420 },                 // the scene dims, then comes back
  alphaRage: { color: 0xc03028, ms: 700, times: 2 }, // Alpha Rex phase 2: red pulses
  breach: { darkMs: 150, splash: { color: 0x9ae8ff, radius: 160, intensity: 2.6, ms: 420 } },
  lightning: { color: 0xdce6ff, ms: 70, flash: 0.35 }
};

// Hit lights: a warm burst at the impact point, brighter and bigger on a crit.
export const SPARK = {
  hit: { color: 0xffc070, radius: 70, intensity: 1.3, ms: 160 },
  crit: { color: 0xffd8a0, radius: 100, intensity: 2.0, ms: 250 },
  block: { color: 0x9ab8ff, radius: 50, intensity: 0.9, ms: 120 }
};

// Post-processing (render/post.js), Medium / High.
// Bloom: only pixels brighter than `threshold` (0-1 luminance) glow, added at `strength`.
export const BLOOM = { threshold: 0.8, strength: 0.65 };

// Color grade per zone: saturation, contrast, then shadows and highlights tinted (rgb
// multipliers, blended by brightness).
export const GRADES = {
  none: { sat: 1, contrast: 1, shadow: [1, 1, 1], high: [1, 1, 1] },
  menu: { sat: 1.04, contrast: 1.04, shadow: [0.95, 0.98, 1.06], high: [1.05, 1.02, 0.96] }, // Home, Hatch, Evolution
  jungle: { sat: 1.08, contrast: 1.08, shadow: [0.88, 1.0, 1.14], high: [1.08, 1.03, 0.92] }, // cool shadows, warm highlights
  swamp: { sat: 0.85, contrast: 1.04, shadow: [0.92, 1.02, 1.0], high: [1.0, 1.02, 0.96] },
  volcano: { sat: 1.1, contrast: 1.12, shadow: [1.0, 0.92, 0.9], high: [1.08, 1.0, 0.9] },
  coast: { sat: 0.9, contrast: 1.05, shadow: [0.9, 0.98, 1.1], high: [0.98, 1.0, 1.04] },
  crater: { sat: 1.05, contrast: 1.08, shadow: [0.98, 0.9, 1.1], high: [0.96, 1.02, 1.06] }
};

// Vignette: from `inner` (0 = center, ~0.7 = corners) outward, darkening by `strength`.
export const VIGNETTE = { normal: { inner: 0.42, strength: 0.38 }, boss: { inner: 0.32, strength: 0.55 } };
