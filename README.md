# Dino-Conquest

A turn-based pixel-art dinosaur roguelike for the browser. Phaser 3 + Vite, plain JavaScript.
All art is generated in code from character grids. No assets are downloaded.

## Run

```bash
npm install
npm run dev      # http://localhost:5173 (also exposed on your LAN for phone testing)
npm run build    # static site in dist/
```

**Deploy to Vercel:** import the folder/repo. Vercel detects Vite automatically (build command `npm run build`, output `dist`). No config needed.

## Playing

Title → Home (Dino-dex, Nest unlocks, goals, family tree, Extinction, Settings) → Hatch an egg → Jungle map → fights → Alpha Rex → Swamp map → fights → Bog Spino.
**Keyboard** (`ui/focus.js`). Arrow keys move a yellow focus ring over the buttons, and **Enter / Space** presses the focused one. The ring only appears once you press an arrow, so mouse and touch players never see it, and moving the mouse hides it again. **Esc** backs out of the Nest menus, and in popups it picks CANCEL / BACK / LEAVE / DONE.

| Screen | Keys |
|---|---|
| Home | arrows + Enter; **Space / Enter** = Continue Run / Hatch; **N** new egg, **S** Settings, **U** unlocks, **G** goals, **F** family tree, **X** Extinction, **D** flips the Dino-dex |
| Nest menus | ↑↓ through the list and footer, **← →** or **Q / E** flip pages, **Esc** back |
| Popups | ↑↓ + Enter, **1–6** pick directly, **Esc** cancels |
| Hatch | arrows + Enter (starts on START RUN), **1–3** |
| Map | ↑↓ / ← → / **W S** pick a path, **1–3** pick directly, **Enter / Space** go |
| Battle | **1–5** moves, **E** ends the turn, arrows + Enter walk the move bar, **Tab / Shift+Tab** (or tap an enemy) picks the target, **Space / Enter / click / tap** for the timing QTEs |

On phones, tap everything.

**Portrait and landscape.** The game has two base resolutions: 320x180 (landscape) and 180x320 (portrait), the same pixel size on a phone. `W` / `H` / `GROUND_Y` in `src/config.js` are live bindings switched by `setPortrait()`, and each scene picks its layout with `lp(landscape, portrait)` (portrait: stacked Home panels, a vertical map climbing to the boss, a battle stage with dinos at 2x, HUDs above and below, and a 3x2 move grid). Rotating rebuilds calm screens (Title, Home, Nest, Map) right away; fights, hatches and end screens switch at the next scene (`syncLayout()` in `systems/screen.js`). Zone backdrops are always drawn at landscape size and placed / cropped for portrait. On phones the canvas scales to fill (fractional at 2x+ density), keeps clear of notches, and the first tap goes fullscreen where the browser allows it.

Scaling is integer-only by design (crisp pixels), so some screens show black borders around the game.

**Graphics quality (v2.3 lighting, step 1).** The game logic stays at 320x180 / 180x320. The graphics tier sets a render scale `rs`: the canvas is `W*rs x H*rs`, and every scene's camera zooms by `rs` from its top-left corner (`render/quality.js` `applyRender()`, called from `syncLayout()`). Sprites stay crisp (nearest), and later lighting steps get smooth gradients at the higher resolution.

- **Tiers** live in `data/quality.js`:

  | Tier | Render scale |
  |---|---|
  | Low | 1, the original look |
  | Medium | 2 |
  | High | 4 |

  The same file sets the lights, bloom and baked-art flags the lighting steps will use. `rs` is capped by the screen's device-pixel zoom, so a 3x desktop renders High at x3, never more pixels than shown.
- **Settings → Graphics** cycles Auto / Low / Medium / High, saved as `meta.settings.gfx`. A new tier applies when the next scene starts (Home rebuilds right away), never mid-fight.
- **Auto** starts at Medium on phones (coarse pointer or a small screen) and High on desktops. It measures the first 3s of the session's first battle, and below 50 fps it drops one tier, remembered as `meta.settings.gfxAuto`. It never raises the tier by itself.
- **No WebGL:** without WebGL (the Canvas renderer) the game is always Low.
- **Camera scroll:** with the camera's origin at the top-left, scroll stays "top-left of the view in world units". The portrait map clamps its own scroll (camera bounds assume a centered zoom), and screen shake works around the current scroll.
- **Lighting (step 2):** on Medium / High, battle dinos are normal-mapped and lit by Light2D (`render/lighting.js` `SceneLights`, one per battle).
  - **Normal maps:** `render/normals.js` builds them from each sprite's alpha, as a distance-from-the-edge dome, and only for textures a fight uses. The T-rex parts share the whole rex's map, so their seams don't show.
  - **Mirrored enemies:** `render/litPipeline.js` is the stock Light2D pipeline taught that a mirrored container is a reflection, not a 180° turn, so enemies' rims land on the right side.
  - **Hit flash:** it switches back to the plain pipeline, so it stays pure white.
  - **Tuning:** each zone's ambient color and key light (sun / moon) live in `data/lighting.js` (the key light is placed from the stage, `side` / `dx` / `dy` above the ground, so portrait and landscape light the fighters the same), along with the hit `SPARK` lights (hit, crit, block): a warm burst at the impact point that lights both fighters. The key light reads mostly as a rim, because Light2D keeps lights close to the sprite's plane, so `ambient` sets how bright the dinos are overall. Bursts over the tier's light cap replace the oldest one.
- **Baked atmosphere (steps 3 and 5, every zone):** on Medium / High, battles use the zone's `bake` settings in `data/lighting.js`, and the Jungle becomes a moonlit night. `render/bake.js` builds each backdrop layer once per zone at the render scale:
  - the zone art is drawn as usual, scaled up nearest-neighbour so pixels stay square;
  - it's color graded (and fogged on the far layer);
  - it's blurred for depth of field: far heavy, mid light with the ground kept sharp (`sharpBelow`), foreground heavy and darker;
  - it's kept as a smooth texture.

  Changing zone frees the last zone's textures. `render/atmos.js` paints the smooth extras:
  - the night sky and moon;
  - god rays (`shafts`, `slant`) and drifting ground mist;
  - a shared glow texture (fireflies; two of them are real lights on High) and a blurred ground shadow, cast away from the key light (`shadow.dx`).

  A fresh bake costs about 260ms at x3 on desktop, once per zone. Menus and the zone intro still use the plain art.
- **Zone moods (step 5):** each zone's `LIGHTING` entry sets its ambient, key light and `bake`. `render/zoneLights.js` adds the extras for every zone but the Jungle:
  - `emitters`: real lights at fixed spots, flickering or pulsing, each with a glow pool on the ground. They stay only while 2 light slots are free for hits, so Medium keeps one and High keeps four;
  - `glows`: rising embers, drifting spores, twinkling motes, all glow sprites, not lights;
  - layered `fog`, `rays`, and the Coast's `lightning` (never during a QTE: `scene.qteActive`).

  The zones:
  - **Swamp:** murky olive, lit green off the water, glowing fungi, heavy fog.
  - **Volcano:** red-brown, lit orange from below with a pulse, flickering lava falls, embers.
  - **Coast:** stormy blue-grey with a pale sun top-left, rays, and lightning every 10–15s.
  - **Crater:** purple-black with pulsing crystals, and the meteor light growing toward the boss (`keyByProgress`).

  `MOVE_LIGHTS` colors each special's hit light (poison green, fire orange, crystal cyan…), and Starfall lights the fight from the sky. `MOMENTS` holds Roar's 30% dim, Alpha Rex's red pulses in phase 2, the Mosasaur's Breach (dark for 150ms, then a splash of light) and the lightning flash.
- **Post-processing (step 4):** on Medium / High, battles run one camera post pipeline (`render/post.js`). It does three passes:
  1. a bright pass (only pixels over `BLOOM.threshold`) into a small buffer, half size on High and quarter on Medium (sized by hand, since Phaser's RenderTarget ignores its scale);
  2. a separable gaussian blur of that buffer;
  3. one full-size composite that adds the bloom, applies the zone's color grade, then the vignette.

  The numbers live in `data/lighting.js`:
  - `BLOOM`;
  - `GRADES`: saturation, contrast, and shadow / highlight tints per zone. The Jungle has cool shadows and warm highlights;
  - `VIGNETTE`: stronger in boss fights.

  The UI is drawn by a second camera without the pass, so HUD text and buttons never glow or shift color. Every frame, objects at depth 10 and up are routed to it, except the spark particles at 19–29, and fades and flashes are mirrored on both cameras. Low has no post pass at all, so it looks exactly like before. (The brief's table said "grade only" for Low; its guardrail that Low stays identical won.)
- **Other screens (step 6):** Title, Home, the map, Hatch, Evolution and the zone intro get a lighter version (`render/menuLight.js`), with no Light2D:
  - the post pass: the zone's grade on Title, map and intro, a soft `menu` grade elsewhere, plus the vignette and gentler bloom. Home has no bloom, since its text sits in the world layer;
  - a soft additive key-light glow from where the zone's light comes from (the Jungle sun on Title, the zone's key on the map, warm light from above on Home, Hatch and Evolution);
  - `burst()` flares that bloom: the hatch reveal glows in the rarity's color, and the evolution flash blazes.

  The zone intro uses the baked backdrop, so it previews the zone as its fights look. When a scene splits off its UI camera mid fade-in, the UI joins that fade. Low adds nothing anywhere.
- **`?fps` in the URL:** a small overlay with fps, tier, render scale and active lights. In dev builds, a QTE frame over 33ms is logged (`[qte] slow frame`).

### Music (v2.4)

Chiptune music, generated live from note data like the SFX: no audio files.
- **Engine:** `systems/music.js` (Phaser-free). A 25ms timer schedules notes about 120ms ahead on the audio clock, so frame drops never make it stutter. Each note is its own oscillator; the pulse waves (`square50` / `25` / `12`) and the drum sounds (kick, snare, closed and open hat, tom, bloop) are built once per audio context. The instruments live in `systems/musicSynth.js`. The mix is lead / bass / arp / drums, then a lowpass at 5.5 kHz to soften the squares, then the music volume, then the shared master in `systems/sfx.js`. The lead also gets one echo, 3 steps later at 0.25. It shares the SFX audio context and starts on the first tap or key. When the tab is hidden, the scheduler stops and the audio clock pauses.
- **API:** `music.play(id, { fade })` crossfades (600ms). Asking for the track that's already playing does nothing, so Map → Battle in the same zone keeps it going. `music.stop({ fade })`. Dev: `__music.render(id, loops)` renders a track offline into an AudioBuffer, for measuring loudness.
- **Reactive music (step 2):** the numbers are at the top of `systems/music.js`.
  - `music.setLayer('map' | 'battle' | 'elite')`: the map has no drums and the lead at 70%; elite fights add a hat after each off-beat and +4 BPM. The layer carries across tracks; menus play `nest` with `{ layer: 'full' }`.
  - `music.setLowHp(on)`: under 25% HP (`battle/battleMusic.js` checks every frame), the lowpass slides to 1.5 kHz over 400ms and a soft heartbeat kick plays on beats 1 and 2.
  - `music.duck(ms)`: −40% for 300ms on crits, kills, Roar and boss phase changes.
  - `music.setPhase2(on)`: one beat of silence, then +8 BPM and the arp switches to `square25`. A new track always starts in phase 1, and leaving a fight resets it.
  - `music.setDim(on)`: 40% while Settings is open.
  - Dev: `__music.state` shows the layer, BPM, lowpass and duck level.
- **Tracks** live in `data/music.js` (`TRACKS`), with the chords, the bass / arp / drum patterns and the lead envelope. The format: `bpm` (16 steps a bar), `leadWave`, `swing`, one chord per bar, one 16-token lead string per bar (a note starts, `-` holds, `.` rests), pattern ids (drums can be a list with one pattern per bar), and a `gain` trim. Optional: `vibrato` on the lead, `detune` (two lead voices, one either side), and `surf` (a filtered-noise swell every few bars, kept on the map layer).
- **The 8 tracks:** `nest`, `jungle` and `boss` from the brief, plus `swamp` (E phrygian, triangle lead with vibrato, bloops for hats), `volcano` (C minor, chugging square bass, tom fills), `coast` (D dorian, long `square12` notes, surf), `crater` (B minor, detuned leads, sparse with soft drums for 4 bars, then full) and `titan` (the final boss: D minor, its lead quoting the Nest motif in minor).
- **Stingers (step 4):** one-shots in `STINGERS` (`data/music.js`). Each is a few parts, each a wave with its own note line, and a held chord is several parts. `music.stinger(id)` plays one on its own path and ducks the track to 30% until it ends. `music.stinger(id, { then: 'nest' })` stops the track instead and starts `then` once the stinger is over.
  - `victory` when a run is cleared (RunEnd), then `nest`;
  - `defeat` when the run is lost (Fossil), then `nest`;
  - `zoneClear` on the ZONE CLEAR banner when there's a next zone;
  - `evolve` starts with the Evolution flicker, so its held note lands on the flash;
  - `hatch` when the egg bursts.
- **Adding a track:** add it to `TRACKS`, set its `gain` so `__music.render` reads about −15 dB RMS like the others, and pick it in `trackFor()`.
- **Where tracks play:**
  - `nest` on Title, Home, the Nest screens and Hatch, and after the end-of-run stinger;
  - each zone's track on the map, zone intro and fights;
  - `boss` in boss fights, `titan` against the Meteor Titan.
- **Settings → Sound:** Music (default 60) and SFX (default 100) volume, 0–100 in steps of 10, plus the Sound on/off toggle, which mutes both. They're saved in `settings.music` / `settings.sfxVol`. The music sits under the SFX (its bus is 0.55 at the default volume).

## Where things live

```
src/
  main.js              game config + integer scaling (device-pixel exact, letterboxed)
  config.js            base resolution (320x180), ground line, UI colors
  data/palette.js      single-char palette keys -> colors
  sprites/grids.js     every dino as a text grid, plus the GRIDS registry
  sprites/renderSprite.js  grid -> Phaser texture (+ white "_flash" variant)
  ui/font.js           code-drawn 5x7 pixel font + text() helper
  ui/backdrop.js       code-drawn jungle, swamp, zone-map and nest backgrounds
  scenes/              Boot (builds textures), Title, Home, Hatch, Map, Battle, Evolution, RunEnd (victory), Fossil (death)
  run/                 run state, progression, map generation
  systems/             combat rules, QTEs, AI, FX, SFX, seeded RNG, meta state
```

### Tuning numbers

- `src/data/species.js`: HP / ATK / DEF / SPD and the special move per species.
- `src/data/moves.js`: move power, energy cost, hits, plus:
  - `ENERGY` (max 3, +2 a turn), `STREAK` (3 crits → next attack +50%), `MUDDY` (flooded attack bar)
  - `QTE`: attack-bar speed and zone widths, dodge/block windows, enemy tell length
  - `QTE_MULT` / `DEFEND_MULT`: crit / good / miss and dodge / block / hit multipliers
- `src/data/brains.js`: every enemy's behaviour cycle and gimmick flags, boss phase 2.
- `src/systems/combat.js`: the damage formula (`computeDamage`).
- `src/data/traits.js`: the 6 traits and their numbers (`TRAIT_TUNING`).
- `src/data/hatch.js`: rarity odds, reroll prices, spin lengths.
- `src/data/unlocks.js`: Nest unlocks and prices, the starting fossil pool, fossil packs, goal-locked fossils and mutations, Golden Egg price.
- `src/data/goals.js`: the 20 goals (a `test` per goal and its reward).
- `src/data/extinction.js`: the 10 Extinction modifiers and the Amber bonus per level.
- `src/data/progression.js` also holds base lives and retry HP.
- `src/systems/save.js`: versioned localStorage save (`SAVE_VERSION` plus `migrate()`). `src/systems/meta.js` holds the loaded save; call `persist()` after changing it. To start over, run `localStorage.removeItem('dino-conquest:save')` in the browser console.

- `src/data/zones.js`: zone layout, enemy groups (`fights` / `elites`, 1–3 enemies each) and levels, a per-zone difficulty `scale`, the zone order (`ZONE_ORDER`), the heal between zones (`ZONE_HEAL`), enemy HP/ATK scaling per node type, rewards, node odds. A boss can carry its own `base` stat block, and each zone has an `enemyBase` for its wildlife, so tuning a hatchable species never changes the zones' enemies.
- `src/data/progression.js`: XP curve, per-level growth, evolution levels and boost.
- `src/data/relics.js`: the 20 fossils (in-run relics) and the evolution perks, with their numbers (`RELIC_TUNING`).
- `src/data/mutations.js`: move mutations for Bite / Tail Whip / Roar.
- `src/data/forms.js`: evolution form names and perks per species.
- `src/data/events.js`: the 8 Meteor Shard events (options, tradeoffs, `need` checks).
- `src/data/zones.js` also holds `SHOP` prices and `LANE_BIAS` (risky top lane, safe bottom lane).

**QTE tuning** (`src/data/qteProfiles.js`):

- **Timing profiles:** each enemy move has one or more: steady, lunge, snap, delay, feint, combo. They're assigned per move in `data/brains.js` and rolled fresh on every hit with the seeded RNG. A profile sets the wind-up length, the ring's shrink curve, a mid-windup pause, a fake-out, and uneven gaps between combo hits. The wind-up animation follows the profile (`battle/anims.js` `windup()`), so it can be read.
- **Per zone (`ZONE_TIMING`):**
  - the dodge and block windows;
  - how often an attack gets a red ring (can't be dodged: a perfect press blocks) or a purple ring (can't be blocked, and Brace doesn't help);
  - the attack bar's sweet and good widths;
  - the chance of an eased marker;
  - the chance of a drifting sweet spot.
- **Extinction:** it tightens the dodge window by 3ms per level and the sweet spot by 1px per 2 levels. No dodge window ever goes under 40ms (touch latency).
- **Dodge fatigue (`FATIGUE`):** each perfect dodge in a row shrinks the next dodge window by 20%, down to 40%. It resets on a hit, on Brace, or after an enemy phase with no perfect dodge.
- **Counter:** the perfect-dodge counter is 0.4× Bite, once per enemy phase.
- **Crit streak:** it counts whole attacks. A move only adds to it if every bar in it crits.

**Balance sim** (`tools/sim.mjs`). It plays full runs on the real rules (`systems/` + `run/` contain no Phaser code, so it imports them directly). Its QTE model is timing-based:

- **Timing error:** every press lands with a normal timing error, whose spread is set by skill.
- **Defend:** a ring's profile widens that spread (lunge/snap ×1.43; delay/combo/feint ×1.96). The press is judged against the real window: zone, fatigue, the Quick Reflexes trait, fossils, tight moves.
- **Attack:** each bar is rolled exactly like the game's. The error turns into pixels at the marker's speed (sweep time and curve). Drift adds error.
- **Skill levels:**
  - Expert: about 90% perfect on steady rings, 75% on lunge/snap, 60% on the hard profiles, about 70% Jungle crits.
  - Skilled.
  - Decent.
  - Average.
- **Picks:** fossils and mutations are chosen by a simple value ranking, like a player would.

```
node tools/sim.mjs 200                       # fresh save, Expert / Skilled / Decent, all 5 zones (ZONES=4 stops before the Crater)
VET=1 node tools/sim.mjs 200                 # veteran: every pack, Sturdy Blood 3, Nine Lives, a Bloodline heir
PLAYS=expert ONLY=compy,rex EXT=3 node tools/sim.mjs 100
```

It prints the share of runs that clear each zone per species, a row weighted by hatch odds, and per-zone QTE stats: perfect dodges per enemy hit, crits per bar, damage taken per fight.

Results (v2.2, fresh save, 200 runs per species, weighted by hatch odds). The brief's v2.2 targets are in brackets:

| Profile | Jungle | Swamp | Volcano | Tidal Coast | Crater |
|---|---|---|---|---|---|
| Expert | 99% | 74% | 46% (45) | 37% (35) | 24% (25) |
| Skilled | 95% | 47% | 22% (25) | 11% (15) | 4% (8) |
| Decent | 53% | 11% | 2% | 1% | 0% |

With a veteran save, Experts clear the Crater 54% of the time (target 45–50%).

| Expert QTE stats | Jungle | Swamp | Volcano | Coast | Crater |
|---|---|---|---|---|---|
| Perfect dodges per enemy hit | 62% | 41% | 38% | 36% | 26% |
| Crits per bar | 71% | 63% | 55% | 55% | 48% |

How the v2.2 tuning got there:
- **Volcano:** a little harder (`scale` 3.25 / 2.4).
- **Crater:** LV17–20 now, at `scale` 2.95 / 2.2.
- **Abyss Mosasaur:** `base` 100 HP / 15 ATK, Deep Bite 1.4, Breach 1.1, and a dive every third action in phase 2. Low-HP dinos (Compy, Raptor) were the ones hitting a wall at it.
- **Pearl Heart:** heals 2.

Perfect dodges per hit look low late on because red rings turn perfect presses into blocks (45% of Crater attacks are flagged, mostly red). That's on purpose: red rings cost perfect-dodgers more than blockers, which keeps the skill levels closer together.

The Jungle stays easy for good players by design: it's the teaching zone, and making it hard for Experts would crush first-timers.

The difficulty levers live in data:
- **Lives and retries:** `BASE_LIVES` (2) and `RETRY_HP` (40%) in `data/progression.js`.
- **Zone strength:** each zone's `scale` and boss `base` in `data/zones.js`, plus `RAMP` (enemies from 80% at a zone's first column to 130% at its last).
- **Healing:** `NEST_HEAL` and `ZONE_HEAL`.
- **QTEs:** the windows, rings and bar widths above.

### The run

`run/run.js` holds the run state (dino stats, XP, evolution, upgrades) and `run/mapgen.js` builds the branching map. The scenes are `Map` (travel; Nest / Fossil Dig / Meteor / Shop visits live in `scenes/mapNodes.js`) → `Battle` → `Evolution` (at LV5 / LV10) → `RunEnd` (victory: banks Amber and crowns the species in the Dino-dex). Each run has 2 lives (3 with Nine Lives). Losing a fight costs one and restarts that fight at 40% HP. At 0 lives the dino goes to the `Fossil` screen, which banks Amber. Both end screens run the final goal check and the Bloodline pick (`ui/bloodline.js`), and add the dino to the family tree. `Home` is the hub: Dino-dex, the Nest menus, and stats.

### Run saving (v2.2)

The run in progress has its own localStorage slot, `dino-conquest:run`, apart from the meta save, so a bad run save can never touch meta progress. Refreshing, closing the tab, or a phone killing it resumes the run: Home shows **CONTINUE RUN**, with the dino, level, zone and lives.

- **What's saved:** a checkpoint plus the choices made since it. The checkpoint is the whole run as JSON (`run/runSave.js` `serializeRun` / `deserializeRun`, no Phaser, so the sim can round-trip runs). It includes the RNG's current state, not just the seed.
- **When:** checkpoints are taken (`systems/runStore.js` `checkpoint(run, phase)`) at these points:
  - hatching;
  - back on the map;
  - arriving at a node, before its content;
  - a fight starting (with its seed);
  - a fight won, before the banner;
  - an evolution;
  - the end screens.
- **Choices:** every popup choice in Map / Battle / Evolution is appended to the save (`ui/popup.js`). On a reload the snapshot is restored and those choices replay instantly, so the player picks up at the first unanswered popup.
- **No rerolls:** the RNG state is restored, so the same fight, Fossil Dig, mutation offer, event or shop stock comes back.
  - A reload mid-fight restarts that fight from its start. It's the same fight, and it costs no life.
  - The Bloodline offers are seeded by the run.
- **Ending:** the run save is deleted after the end screen's Bloodline pick, once everything is banked. A reload on an end screen resumes it without banking Amber twice (`run.banked`).
- **Abandoning:** **NEW EGG** asks first, then sends the saved run through the normal death flow (Fossil screen, Amber banked, Bloodline pick, family tree).
- **Safety:** the run save has its own version (`RUN_VERSION`, `migrateRun()`). An unreadable save is dropped, and Home says "RUN LOST". Zone order is stored in the run, so a run from before a new zone existed resumes as it was.
- **Run stats:** both end screens show a RUN STATS panel before the goals and Bloodline pick (`ui/runStats.js`). It lists fights won, attack bars by result, defend presses by timing, QTEs missed (count and share), damage dealt and taken, biggest hit, and crit streaks. The counters live in `run.stats` (`bar_*`, `ring_*`, `dmgDealt`, `dmgTaken`, `bestHit`, `fights`), so they survive a reload.
- **Clearing it:** to drop a stuck run, run `localStorage.removeItem('dino-conquest:run')` in the browser console.

### Zones

A run goes through the zones it has (`run.zones`: `ZONE_ORDER` in `data/zones.js` minus zones still locked in the Nest):
- **Jungle**: Compy, Raptor, Elite Trike, boss Alpha Rex (summons a Compy).
- **Swamp** (LV5–8): Pachy, Sarco, Elite Sarco / Raptor, boss Bog Spino (floods the arena).
- **Volcano** (LV9–12, a 200 Amber Nest unlock): Ankylo (guards, then a charged Club Swing that stuns on a clean hit), Dimetrodon (basks to heal 20%), Pteranodon (dives; dodges sloppy attacks), Elite Ankylo / Dimetrodon, boss **Cinder Stego** (spiked guard, Magma Tail; phase 2 summons a Pteranodon).
- **Tidal Coast** (LV13–16, 300 Amber, needs the Volcano). The gimmicks live in `systems/battleState.js` and each shows in the intent first:
  - **Dilophosaurus:** Venom Spit (eye icon). Unless you perfect-dodge it, your next attack bar starts hidden (`BLIND.hide`, 30%).
  - **Plesiosaur:** sits low in the water (LOW tag, −30% damage taken, `COAST.lowMult`) except on the turn its purple-ring Tide Lunge comes (every 3rd action).
  - **Ichthyosaur packs:** fragile and fast, with `combo` timing. They slip away from missed bars (no pounce), so Tail Whip (can't miss) and Sweep counter them.
  - **Elite Baryonyx:** Fish Hook (hook icon). A block still gets you hooked: next turn you can only attack, but it takes double damage while holding you (`COAST.hookMult`).
  - **Elite Dilophosaurus.**
  - **Boss: Abyss Mosasaur.**
    - Phase 1: Deep Bite (`lunge`) and Undertow (−1 energy next turn on a hit).
    - Phase 2: it dives every third action (untargetable) and surfaces with a purple, `delay`-profile Breach. It summons one Ichthyosaur.
  - **Art:** the sprites live in `sprites/grids3.js` (shape builder, with a 1px `margin` so edge pixels get an outline). The backdrop is in `ui/zoneArt3.js`: a stormy dusk with a pale sun, sea stacks and a cliff line, 3-frame wave crests, wet rocks, tide pools, kelp and driftwood. Gulls, sea spray, and a wave that washes over the foreground every 8s. The boss fight adds rain (`opts.boss`), and its phase 2 raises the tide over the dinos' feet (`backdrop.onPhase`). On the map the coast runs along the bottom edge, and a boss wider than 44px shows only its head end on the landscape map.
  - **Tide Fossils pack** (120 Amber, or free from the Tidebreaker goal):
    - **Pearl Heart:** heal 3 each turn.
    - **Tide Charm:** Brace also banks +1 energy for next turn.
    - **Kelp Wrap:** the first unblockable hit each fight deals 0.
    - **Shark Tooth:** crits bleed the target for 3 a turn, for 2 turns (`status.bleed`).
  - **Mosasaur trophy:** the boss always drops a pick of the pack (`boss.drop`, `fightRewards`).
  - **Coast-only events** (`zones` on an event):
    - **Shipwreck of Bones:** 60% a fossil, 40% the node turns into a Plesiosaur fight (`ctx.ambush`).
    - **Glowing Tide Pool:** drinking gives a mutation, or poison 3 at the start of the next fight (`run.poisonNext`).
  - **Goals:**
    - **Tidebreaker:** beat the Mosasaur. Unlocks the Tide pack.
    - **Dry Feet:** clear the Coast without taking an unblockable hit (`run.stats.purpleHits_coast`). +200 Amber.
- **Meteor Crater** (LV17–20, 400 Amber, needs the Tidal Coast; old saves that owned the Crater get the Coast free in `migrate()`): Carno (enrages at half HP), Stego (raises spikes: hitting it while guarded pricks you), Raptor packs, Elite Carno / Stego, final boss **Meteor Titan** (Starfall; phase 2 summons a Raptor and speeds up).

Beating a zone boss gives XP and Amber, heals `ZONE_HEAL` (35%), and `advanceZone()` in `run/run.js` builds the next zone's map. Level, XP, traits, lives and Amber carry over. `RunEnd` only comes after the run's last zone. Battle and Map pick their backdrop per zone (`ui/zoneArt.js` for Jungle / Swamp, `ui/zoneArt2.js` for Volcano / Crater, `ui/zoneArt3.js` for the Tidal Coast, `drawMapBackground` in `ui/backdrop.js`). The Crater's meteor grows in the sky as you get closer to the boss. To add a zone, add an entry to `ZONES` and `ZONE_ORDER`, plus its layers in the zone art registry.

There are 13 hatchable species: Compy, Pachy, Ankylo (Common); Raptor, Sarco, Pteranodon, Dilophosaurus (Rare); Trike, Spino, Stego, Therizinosaurus (Epic); T-Rex, Carno (Legendary). v2.2 added two Nest eggs:
- **Dilophosaurus** (120 Amber): Venom Spit costs 1 and poisons 2. It also **calms** the target: its next attack loses its timing profile and comes as a plain `steady` wind-up, with no feint. Forms: **Frill Spitter** (Venom Spit hits all), then **Toxic Crown** (poisoned foes take +25%).
- **Therizinosaurus** (180 Amber): Scythe Claws slashes 3 times, and each crit adds +1 DEF for the fight. Forms: **Reaper** (4 slashes), then **Grim Harvester** (kills heal 15%).
- **Animations:** both have their own, in `battle/anims2.js` (a venom glob in an arc, and a high/low 3-slash rake). Their Dino-dex cards use `short` names.

All Nest-egg species: Ankylo, Pteranodon, Stego and Carno are Nest eggs (`unlock` in `data/species.js`; `hatchable()` in `systems/meta.js` filters the hatch pool). Their specials: Club Smash (a crit stuns), Dive Bomb (can't miss), Thagomizer (poisons 2), Gore Rush (+50% against targets under half HP). Each has two evolved forms with perks (`data/forms.js`, `sprites/forms.js`). Their sprites are built with a small shape builder (`sprites/shapes.js`, `sprites/grids2.js`). Dimetrodon is `enemyOnly`. The Dino-dex shows 4 species per page. The Swamp's wildlife and the Bog Spino have their own stat blocks (`enemyBase` and `boss.base` in `data/zones.js`), so the hatchable Pachy, Sarco and Spino can be tuned without moving the zone. Their specials are Skull Bash (pierces DEF), Death Roll (3 bites) and Swamp Surge (charges up, then hits with a tight dodge window).

### Content (v2 Phase 5)

- 12 enemy types, each with a gimmick, and 4 bosses with 2 phases. New intent kinds: `bask` (heal), `spikes` (thorny guard); new move flags: `stunOnHit` (enemy), `critStun`, `poison`, `execute` (player).
- 30 fossils: the 10 new ones (Ember Core, Obsidian Scale, Lava Fang, Ash Cloak, Star Shard, Crystal Heart, Meteor Iron, Amber Geode, Twin Horn, Ptera Bone) come in two new Nest packs and two goals.
- 11 Meteor events (new: Lava Vent, Fallen Star, Crystal Grove) and 22 goals (new: Firewalker, Titan Slayer).

### Builds (v2 Phase 2)

- **Fossils (relics)**: passives that change fights (crits heal, Roar costs 0, enemies start poisoned, revive once, +1 max energy...). Pick 1 of 3 at Fossil Dig nodes; every elite drops one; shops sell them. Owned fossils show as icons in battle (top middle) and on the map HUD; tap one to read it. Several combo with traits (Venom Bite + Tar Pit Stone / Venom Gland, Quick Reflexes + Raptor Claw / Swift Feather, Bloodlust + Blood Amber, Pack Instinct + Pack Totem, Thunder Roar + Bone Drum / Echo Rock).
- **Mutations**: each level-up offers one for a random un-mutated base move (Venom / Lifesteal / Chain Bite, Sweep / Stunning Whip, Terror / Battle Roar). The move button shows the new name and a colored badge.
- **Shop** (in-run Amber, so spending means banking less) and **8 Meteor Shard events** with real tradeoffs. Map lanes lean risky (top: elites, digs) or safe (bottom: nests, shops).
- **Evolutions** get new silhouettes, built from the base grid in `sprites/forms.js` (grow a crest / frill / sail / dome, horns, spikes, scars, stretch the body, new palette), plus a perk per form (`data/forms.js`). The Evolution scene flickers white silhouettes of both forms, flashes, and slams the new name in; tap to skip.
- All effects live in `systems/build.js` as hooks the combat rules call (battle start, turn start, cost, strike, kill, brace, block, roar, revive).

Test a build quickly: `?p=compy&e=compy-s,compy-s,compy-s&r=packTotem,meteorChip&m=bite:chain,tail:sweep` (`r` = fossil ids, `m` = move:mutation pairs).

### Meta progression (v2 Phase 3)

- **Nest unlocks** (`scenes/Nest.js`, mode `unlocks`): spend banked Amber on fossil packs (4 fossils each), Twin Clutch (pick 1 of 2 eggs, rarity shown), Trader Trails (twice the shops), and 3 small stat bonuses (Sturdy Blood, Egg Whisper, Nine Lives). The 4 new species eggs and the Volcano / Meteor Crater zones are listed as COMING SOON until Phase 5.
- **Fossil pool**: a new save drops only 8 fossils. Packs add 8 more, and 4 come from goals. Chain Bite, Stunning Whip and Battle Roar also start locked behind goals.
- **Bloodline**: when a dino dies or clears a run, you pick 1 of its fossils or mutations (up to 5 offered). The next hatchling starts with it. The **family tree** (`Nest`, mode `family`) lists every past dino with its form, level, fate, and what it inherited and passed on.
- **Goals**: 20 goals (`data/goals.js`), each pushing a different playstyle (dodging, bracing, crit streaks, poison, Roar, Tail Whip, shops, no nests, Commons...). Rewards are Amber, fossils, mutations, the Golden Egg (Rare or better, 40 Amber), a 20% shop discount, the Alpha Rex skin, and Extinction levels. Combat counters live in `run.stats` (`tally()` in `systems/battleState.js`). `systems/goals.js` checks them after every won fight, zone clear, run end and hatch.
- **Extinction levels 1–10** (unlocked by clearing the Swamp): pick one on Home (X). Each adds a modifier on top of the ones below it, through `run.mods` (enemy HP / ATK, faster wind-ups, fewer nests, 2-trait elites, one life fewer, weaker nests, tougher bosses). Each level banks +10% Amber. The Dino-dex shows the highest level each species has cleared (`X3`).
- **Save v2**: `migrate()` in `systems/save.js` turns v1 Lineage stacks into 15 Amber each, and keeps the Dino-dex, stats and old fossils (as the family tree). Home shows a one-time notice.

### Daily Hatchery (v2.6)

A daily featured-dino egg banner paid with banked Amber. **No real money, ever:** there are no purchase buttons, no ads and nothing tied to pulls outside the game.
- **Data:**
  - `data/gacha.js`: prices, rates, pity, filler, crafting, the weekly schedule;
  - `data/variants.js`: the 6 variants, their weights, glows and perk numbers.

  The rules are in `systems/gacha.js` (Phaser-free and pure on `meta.gacha`). `hatcheryPull(n)` in `systems/meta.js` pulls on today's banner and saves before any reveal.
- **Banner:** one per UTC day (`bannerFor(day)`), the same for everyone with no server:
  - Mon / Thu: a Rare (Raptor, Sarco, Pteranodon, Dilophosaurus);
  - Tue / Fri: a Legendary (T-Rex, Carno);
  - Wed / Sat: an Epic (Trike, Spino, Stego, Therizinosaurus);
  - Sun: Any Legendary.

  Each rarity rotates through its list on its own days, so every species comes round within two weeks. Commons are never featured. A banner can feature a species whose Nest egg isn't bought yet; pulling it is the other way to get one.
- **Pulls:** 50 Amber, 450 for 10, and one free single a day (resets 00:00 UTC, doesn't stack).
  - **Featured chance:** Rare 12%, Epic 8%, Legendary 5%. A featured hit is a variant 30% of the time (weights 7/7/6/6/3/1).
  - **Pity:** the featured dino is guaranteed on the 30th pull without it. The counter is shared by every banner, carries over between days, and resets on any featured hit.
  - **Never blank:** otherwise 60% Bone Shards (10–30), 35% a random dino (Common 70 / Rare 25 / Epic 5%, from what you can hatch, never a Legendary), 5% Amber back (25–75).
- **Yours for good:** a pulled dino (or variant) you don't have yet joins your collection permanently, and you can start runs with it as often as you like. Pulling one you already have turns it into Amber instead (`DUPE_AMBER`): Common 10, Rare 20, Epic 35, Legendary 60, and 100 for a variant you already own. A new variant of a dino you own isn't a duplicate.
- **Fairness:**
  - Each pull has its own seeded RNG from the save's pull counter and salt, not the date, so pulls can't be predicted or replayed.
  - Pulls are applied and saved before the reveal, so a refresh can't reroll or lose one.
  - Changing the device clock can still farm the free pull; that's accepted for a single-player game.
- **Save v3:** `meta.gacha` holds `{ owned, variants, shards, pity, lastFree, credits, count, salt, history }`, and the history keeps the last 50 pulls. Older saves start with nothing and a free pull. Saves from the egg-count version have every egg they held turned into an owned dino, and the variant it carried (`upgradeGacha`).
- **Collection and shards:** `collection(g)` lists what you can start as: each owned dino and each of its owned variants (keys `rex` / `rex:magma`). `craft` buys a variant you don't have yet, for a dino you own, for 600 Bone Shards (`buyableVariants`).
- **Variants (step 2):** six color variants for every hatchable species.
  - **Looks:** palettes in `sprites/variantArt.js`, applied on top of the skin's own colors (so every evolved form keeps its shape), then snapped to Endesga 32. Albino is pale with pink eyes; Melanistic near-black with amber eyes; Frost icy blue with a white belly; Magma red-black with glowing orange cracks; Fossil bone with dark rib gaps; Golden gold with sparkle pixels.
  - **Skins** are keyed `rex~magma` / `rex~magma_e2` (`skinOf(species, evo, skin, variant)`). They're built the first time they're drawn (`ensureSkin` in `sprites/skinBuild.js`, about 1ms each), since all 234 at boot would slow the start. `createRig` calls it, so any scene can show one.
  - **Perks** (`systems/build.js`, numbers in `data/variants.js`):
    - Albino: +10% dodge window.
    - Melanistic: +10% damage in the Jungle, Coast and Crater.
    - Frost: crits have a 15% chance to SLOW for 2 turns. SPD only decides who goes first in a fight, so SLOW makes the enemy's wind-ups 20% longer instead.
    - Magma: hits have a 10% chance to BURN (3 a turn for 2 turns).
    - Fossil: revive once per run at 20% HP. It doesn't stack with the Old Egg; the Old Egg wins.
    - Golden: +25% Amber from fights.
  - **Shown:** each variant has its own soft light in fights (Medium / High). The HUD reads "T-REX · MAGMA" in the variant's color (just the colored name if it doesn't fit). The family tree shows the variant's sprite and name.
  - **Dino-dex:** tap a discovered card, or press V, for that species' variant page: owned variants with their perk, the rest as silhouettes with their odds. Use < > or the arrow keys to flip species. Cards show a gold `n/6` badge.
  - **Test fights:** `?p=rex&v=magma`.
- **Banner screen (step 3,** `scenes/Daily.js`, the **DAILY** button on Home, key Y; it shows FREE PULL! when today's is unused):
  - The featured dino, big and idle in its home zone's lighting (`HOME_ZONE` in `data/gacha.js`; Sunday's Legendaries take turns). Beside it, its 6 variants come by one at a time: silhouettes unless you own them.
  - The info panel: rarity and featured rate, stats, special, the variant share, a pity bar ("PITY 12/30"), the countdown to 00:00 UTC (the screen reloads itself with the new banner), and how many dinos you own and your Bone Shards.
  - Buttons: FREE PULL / PULL X1 (50), PULL X10 (450), DINOS (your collection and buying variants), RATES (every odd, the pity rule, "no real money"), HISTORY (the last 50 pulls, 8 a page, featured hits starred), BACK.
- **Pull reveals (step 3,** `ui/pullReveal.js`). The pull is paid, rolled and saved first (`hatcheryPull`), then shown.
  - **Single:** an egg drops in and cracks in 3 stages while light leaks out in the result's color: grey shards, amber refund, the egg's rarity color, or gold for a featured hit. A featured hit also ducks the music and rises a chime with each crack. A variant flashes its own color and slams VARIANT!.
  - **The opening:** the egg bursts (the `victory` stinger for a featured hit, `hatch` otherwise), the dino roars, and its card slides in with its name and variant, its perk or special, and NEW! for a dino or variant you didn't have (a duplicate says "ALREADY YOURS: +20 AMBER"). Shards and Amber show as a little pile.
  - **Ten:** 10 eggs crack one after another, each showing what it held in its color (tap to hurry). Then the best one gets the full reveal, then a summary (what's new, shards, and the Amber from duplicates).
  - After the first reveal of a session, a tap skips the build-up.
- **Starting a run (step 4,** `scenes/Hatch.js`). With dinos in the collection, tapping the nest asks HOW TO HATCH?:
  - **Random Hatch:** the usual species and trait spins. Twin Clutch and the Golden Egg still work here, and choosing it gives **+50% Amber for the run** and **+1 free reroll** (`RANDOM_HATCH` in `data/gacha.js`; `run.amberBonus` goes into `amberMult`).
  - **From Collection:** pick a dino you own in a grid (`ui/eggPicker.js`). Each cell has a rarity-colored frame and a badge in the variant's color, and you pick by tap or arrows + Enter, 12 a page. The trait is still rolled (rerolls cost Amber as usual), and REROLL DINO is off. Nothing is used up: it's yours to start as again.
  - With nothing in the collection, it's a Random Hatch, bonus included.
  - **Variants on random hatches:** a species you own variants of comes out as one of them 10% of the time (rolled again on a species reroll).
  - The variant shows under the dino with its perk. The run save stores `run.egg` (the collection key it started as, or null), `run.dino.variant` and `run.amberBonus`.
- **DINOS screen (step 5,** `ui/craftMenu.js`, the DINOS button): your Bone Shards and your dinos (the same grid as the Hatch screen's collection), and **BUY A VARIANT**: a look you don't have yet for a dino you own, 600 shards. It asks first, saves straight away, and checks Collector / Rainbow Rex.
- **Goals (step 5),** checked after every pull (event `{ type: 'pull', results }`):
  - **First Pull:** a free pull (`meta.gacha.credits`, used after the day's own, so the button reads "1 LEFT").
  - **Collector:** own 3 different variants; +300 Bone Shards.
  - **Gold Rush:** pull a Golden variant; +200 Amber.
  - **Rainbow Rex:** own all 6 T-Rex variants; a T-Rex's HUD name cycles through the rainbow from then on (`flair:rainbow`).

  Goal rewards can now also be `pull` and `shards`.
- **Polish:** a Fossil-variant ancestor comes back extra bony in an Ancestor Call: bone-white, with bone dust instead of cold motes.
- **Odds check** (`node tools/gacha-odds.mjs`, exact and simulated through the real rules):

  | Banner | Avg pulls | Avg Amber (singles / 10-pulls) | Worst case |
  |---|---|---|---|
  | Rare 12% | 8.2 | 408 / 367 | 30 pulls: 1,500 / 1,350 |
  | Epic 8% | 11.5 | 574 / 516 | 30 pulls: 1,500 / 1,350 |
  | Legendary 5% | 15.7 | 785 / 707 | 30 pulls: 1,500 / 1,350 |

  On the way to a Legendary hit you also collect about 178 shards, 5 eggs and 37 Amber back on average. At 100–200 Amber a run, that's about 4–6 runs for a Legendary, with the guarantee at about 9.

### Art (v2 Phase 4)

- **Palette**: all sprite art is locked to Endesga 32 (`data/palette.js`). `PAL` keys are picked from it, and `renderSprite.js` snaps every pixel (evolution hue shifts, skins, fossils) to the nearest entry with `toEndesga()`. `E32` names the palette for code-drawn backgrounds and UI.
- **Battle composition**: dinos stand at 3x on a ground line at y 132 (`GROUND_Y`), with the player at x 80. Small pack members and summoned minions stay at 2x so a 3-enemy pack fits. Every battle and title dino has a soft drop shadow (`rig.addShadow()`). Enemy markers stay below the HUD for tall sprites (`MARK_TOP`).
- **Backdrops** (`ui/zoneArt.js`): Jungle and Swamp each have 4 layers (sky, far, mid + ground, near/foreground), pre-rendered to textures once. Layers sway 1–2px, lean against lunges (`backdrop.shift`), and ambient bits keep moving: light shafts, fireflies and falling leaves in the Jungle; mist bands, bubbles and dragonflies in the Swamp. The foreground ferns / cattails draw in front of the dinos.
- **UI**: stone panels (`ui/pixel.js` `panel()`: top highlight, dark bottom edge, corner rivets, speckle), 8x8 move icons (`sprites/moveIcons.js`; the special shows the species head), titles (scale 2+) with a 2px shadow and a 1px highlight, a 3x5 small font (`ui/fontSmall.js`, `text(..., { small: true })`) for sub-lines, captions and descriptions, rarity glow on the hatch card and rarity cards in the Dino-dex.
- **Juice**: hitstop 60ms on hits and 120ms on crits; shake scaled by the share of HP a hit takes; dust puffs on hops and landings; leaf / water-drop debris on hits; damage numbers in the 2x font on a small arc (crits flash white, then go gold); deaths flash white 3 times and dissolve into falling pixels (`deathAnim` in `battle/gimmicks.js`); 150ms fades; hatch reels take 1.5s in total and a tap skips them.

### Hatching

`scenes/Hatch.js` handles the egg, the species spin, the trait spin, rerolls, and START RUN. The reels are in `ui/reel.js`, the buttons in `ui/button.js`, and the egg in `sprites/egg.js`.

### Perfect Moments (v2.5 step 0)

Every perfect dodge and every crit gets a short tension → calm → release beat. The numbers are in `data/flow.js`, the rules (streak, aimed counter) in `systems/flow.js`, and the presentation in `battle/flow.js` (one `Flow` per battle, `scene.flow`).
- **Perfect dodge → aimed counter:**
  - **Calm:** when the dodge is on the attack's last hit, the clock slows to 0.2× for 350ms (real time). Everything but the player's dino dims, the music ducks to 25% with a 900 Hz lowpass (`music.setCalm`), a water-drop chime plays, a ripple runs across the ground, and a cyan afterimage stays where the hit would have landed.
  - **Aim** (up to 600ms, still slowed): three weak points on the attacker. Head = the counter crits; legs = HOBBLED (ATK down for 2 turns); tail = BLEED (2 a turn for 2 turns). Tap one, or use ←/→ then Space; ↑/↓, Tab or a tap on another enemy switches target in packs. Running out of time picks the head.
  - **Release:** time snaps back, then a 2-frame dash with speed lines and afterimages, a 90ms hitstop, a snap, and a zip home. The counter happens before the attacker heads home.
  - The damage rules are unchanged (once per enemy phase, 0.4× base, fossils still boost it); a head counter rolls as a crit.
  - **Guardrails:** the calm only starts once the dodge ring has resolved, and a combo's next ring only opens at full speed, so QTE timing never changes. From the 3rd perfect dodge in a round, the calm is 150ms and the aim reuses the last point. Settings → **Counter aim: Manual / Auto** (Auto always takes the head, with no aim window).
- **Crit → clean hit:** the bar flashes white and a crystal ting plays (it replaces the old ding in battles), then a 150ms freeze with a vignette pull and a short music duck. The swing then plays at 1.6× with afterimages and speed lines, and lands with extra sparks and a bigger light flash.
- **Streak:** consecutive perfects (dodges and crits). Each one plays its chime / ting a note higher, climbing a pentatonic scale in the current track's key (`music.key`; minor tracks use the minor pentatonic). A hit taken or a missed attack breaks it with a soft sigh. Blocks and good hits don't count either way.
- **Aura** (`battle/aura.js`): a shimmer at a streak of 1, flames at the feet from 3, and a full aura plus a soft light from 5. No new particles while a QTE is open.
- **Sounds** (`systems/perfectSfx.js`): chime, ting, snap and sigh, with a convolver reverb whose impulse response (decaying noise, 1.2s) is built once on the first tap.
- The sim still uses the plain counter.

### Primal Surge, Apex Strike, Ancestor Call (v2.5)

A rage meter that ends in a species-unique cinematic finisher. The numbers are in `data/surge.js`, the rules in `systems/surge.js` (Phaser-free, `st.surge`), the meter / button / activation in `battle/surge.js` (`scene.surge`, made by the `Flow`), and the strike in `battle/apex.js`, `battle/rhythm.js` and `battle/apexMoves*.js`.
- **Meter** (0–100), a thin bar under the player's HP, dim orange to gold. When full it pulses and a gold light glows at the dino's feet.
  - **Gains** (halved from the brief in the balance pass, see below): perfect dodge +10, crit +8 (once per move), kill +5, hit taken +5, block +3. Perfects on a streak above 2 get +5 more, and every gain is ×0.5 in a boss fight. Each gain pops a gold "+n".
  - **Carry-over:** half carries into the next fight through `run.surgeMeter`, which is saved with the run and reset to 0 in a new zone. A reload restarts the fight from its checkpoint with the meter it started with.
- **SURGE! button** (key **R**): appears above the move bar when the meter is full, on the player's turn, for 0 energy.
  - **Activation** (~1.2s): the arena darkens, the music cuts for a beat, the dino crouches and roars (shockwave, dust, debris), grows 15%, and a flickering aura in the species' color (a variant's glow if it has one) lights the arena. The music switches to its surge layer (`music.setSurge`: +10 BPM, the lead on `square25` an octave up, `hard` drums) and PRIMAL SURGE slams in. After the first time each run it runs faster and a tap skips it.
- **The surge:** 2 player turns (the one it starts on counts).
  - +1 energy when it starts, even past the max, and attacks can't miss (the bar can't come up MISS).
  - Crits hit for ×2.0 instead of ×1.75.
  - Enemies get FEAR (−10% ATK). Bosses get STAGGER instead: their next charge-up is skipped, and phase 2 waits until the surge ends, then plays out.
  - Slot 5 (the special) becomes **APEX**. When the surge ends, the aura fades, the dino shrinks back, the music returns and the special comes back.
- **Apex Strike** (2 energy, once per surge):
  - **Presentation:** letterbox bars, the clock at half speed, a 1.25× camera zoom toward the action (Medium / High only, since on Low the HUD would zoom too), and the arena dims.
  - **Rhythm QTE:** 5 markers scroll to a hit line on the music's beat (`music.beat()` gives the next beat in `performance.now()` time, output latency included). The QTE runs on real time, so the slowed clock never moves the beats. Windows are perfect ±60ms and good ±130ms, scaled by the zone like the other QTEs. A combo shows "PERFECT x3!", and each landed beat is one hit in the animation.
  - **Finale:** a 200ms hitstop, a white flash, a shockwave, the biggest shake in the game and a 3× damage number that holds for 600ms. A kill dissolves in slow motion, and all 5 perfect flashes APEX!.
  - **Damage:** each landed beat is a share of the target's max HP (6% of a normal enemy, 2% of a boss) × a species factor from its special (√(special power / 1.5), about 0.9–1.15). Perfect beats are ×1.25 and all perfect is ×1.35. Enemy HP grows much faster across the zones than the dino's damage, so a share keeps it on target everywhere: 3 perfect + 2 good takes ~35% of a normal enemy and ~11% of a boss. The aoe species (Compy, Trike, Ankylo, Stego) hit every enemy at ×0.6.
- **The 13 strikes** (`APEX_ANIMS` in `battle/apexMoves.js` + `apexMoves2.js`; each is `{ start?, beat(ctx, i), finale(ctx) }`, and the finale awaits `ctx.impact()` as the last hit lands):
  - T-Rex Tyrant Crush: clamps and shakes the enemy every beat, then slams it.
  - Raptor Pack Frenzy: a ghost raptor leaps in every beat, and the last one is the real one.
  - Carno Horned Rampage: dashes through with afterimages.
  - Compy Swarm Tide: waves of tiny compies.
  - Trike Stampede: glowing horns, charges through everyone.
  - Ankylo Earthshaker: the club slams and cracks spread.
  - Pachy Skullquake: a headbutt combo with stars.
  - Stego Spike Storm: spikes fired up rain down.
  - Spino Tidal Maw: rides a rising wave in, biting.
  - Sarco Abyss Roll: a death roll, faster each beat.
  - Pteranodon Sky Strike: dives from off the top.
  - Dilophosaurus Venom Bloom: frill flare, spit, poison clouds.
  - Therizinosaurus Reaper's Harvest: crossing slashes and an X.

  Evolved forms (evo 2) get extra particles. **To add one for a new species:** give it an `APEX_STRIKES` entry (name, aura, `aoe`) and an animation set, built from `battle/apexKit.js` (cloneRig, slash, crack, shoot, puff, beatHit).
- **Ancestor Call (step 4):** `systems/ancestors.js` (rules), `battle/ancestor.js` (on screen), numbers in `ANCESTOR` (`data/surge.js`).
  - **When:** once per run (`run.ancestorCalls`), after the Apex Strike's 5th beat, if the family tree has anyone and a target survived the strike. A "CALL YOUR ANCESTOR? [TAP]" prompt waits 1.2s while the clock is still slowed.
  - **Who:** the strongest ancestor: highest level, then the more evolved form, then the most recent.
  - **The sequence:**
    - The screen goes nearly black but for the fighters, and a soft held chord in the Nest's key swells (the `ancestor` stinger).
    - The ancestor rises behind the player as a spirit: its last form and color variant, washed pale cyan, see-through with a soft glow, 10% bigger, with dust motes and a cold light behind.
    - Its card shows the family tree's name, level, generation and fate ("FELL IN THE VOLCANO").
    - After the player's finale, it strikes with its own species' Apex finale, nods, and dissolves upward into light.
  - **Its hit** is a share of max HP like the Apex Strike: 22% of a normal enemy and 9% of a boss, ×0.8–1.2 by its level (full at 15), with its species' factor and aoe.
  - **Family tree:** the ancestor gets a cyan ✱ and "ANSWERED <NAME>'S CALL" (`answered`, `helped` on its entry).
  - **First fall:** a one-time hint pops up in the Nest: "Fallen dinos can answer your call in future runs." (`meta.hints.ancestor`; `meta.notice` can now be `{ title, lines }`).
- **Sounds and lights (step 5):**
  - **Sounds:** `surgeRoar` (a roar bigger than Roar over a low boom), `beat` (each landed Apex beat a step higher), the `apex` stinger on APEX!, the `shimmer` as the ancestor rises, and the `ancestor` held chord.
  - **Lights:** the surge aura is a flickering point light in the species' color. The Apex finale lights the whole arena with a big white burst, and the ancestor has a cold light behind it.
  - **On Low**, with no real lights, the aura and the ancestor get a soft additive glow instead, and the white flash still plays. During the rhythm QTE the only particles are the beat hits.
- **Fossils (step 6):**
  - Primal Fang: +25 meter at the start of every fight.
  - War Drum Bone: the surge lasts 3 turns.
  - Rage Gland: hits taken give 2× meter, −10% max HP.
  - Spirit Amber: two Ancestor Calls a run.

  War Drum Bone and Rage Gland are the **Surge Fossils** Nest pack (80 Amber). Primal Fang and Spirit Amber are goal rewards.
- **Goals (step 6):**
  - **Apex Predator:** an Apex Strike with all 5 beats perfect; +100 Amber and Primal Fang.
  - **Blood Remembers:** your ancestor finishes a boss; Spirit Amber.
  - **One-Turn Wonder:** 3 kills with one Apex Strike; +150 Amber.

  They read `run.stats` (`apexPerfect`, `ancestorBoss`, `apexKills`), and a goal reward can now carry Amber and a fossil together.
- **Balance (step 6, `node tools/sim.mjs`, with `SURGE=0` for the game without v2.5):**
  - **Sim policy:** the sim fills the meter the same way and surges at 100 on the first turn an elite or boss is there or the dino is under half HP. It uses the Apex as soon as it can, with beats perfect 85 / 65 / 40% for expert / skilled / decent (else good 70%, miss 30%). It counters perfect dodges at the head, and veterans call a Lv10 ancestor.
  - **The brief's numbers were far too strong:** expert Crater clears went from 24% to 62%, with 0.5–0.8 surges a fight. The tuning knobs (`GAIN_K`, `APEX_K`, `APEX_BOSS`, `CRIT`, `FEAR`, `SENERGY`, `SETURN`, `ALLP`) showed the Apex damage and the +1 energy every turn did most of it. So the gains are halved (with a capped streak bonus), the +1 energy only comes when the surge starts, crits are ×2.0, FEAR is −10%, and the Apex was cut, then brought halfway back up after play-testing (it felt too weak).
  - **Now:** about 1 surge every 2–3 fights (0.3–0.6 a fight; the long Volcano fights get the most).
  - **Clear rates vs `SURGE=0`**, by zone (Jungle → Crater):

    | Player | Jungle | Swamp | Volcano | Coast | Crater |
    |---|---|---|---|---|---|
    | Expert | 0 | +3 | +14 | +13 | +12 |
    | Skilled | +1 | +5 | +9 | +6 | +4 |
    | Decent | +15 | +2 | +1 | 0 | +1 |

    Decent players get the most help in the Jungle, from the hits they take, which is the comeback the brief asked for. The aimed head counter alone is worth +1–4.
  - **The trade-off:** a well-played Apex takes ~35% of a normal enemy and ~11% of a boss: the low end of the brief's 35–50%, and under its 15–20% for bosses. That's a deliberate middle between its damage targets and its clear-rate cap (+5–8), which experts now pass in the late zones.

### Battle code (v2 combat)

Each round: every enemy shows an **intent** (what it will do next, with exact damage) → you spend **energy** (max 3, +2 a turn) on as many moves as you can afford → **END TURN** → each enemy does what it showed. Brace (1 energy) turns missed dodges into blocks until your next turn. A perfect dodge earns a free counter-bite. 3 crits in a row empower your next attack. Roar hits every enemy; Swarm spreads its 3 hits across them.

- `systems/battleState.js`: the pure turn rules (energy, intents, strikes, enemy actions, boss phases). Shared by the scene and the balance sim.
- `data/brains.js`: enemy behaviour. Compy packs, Raptor (evades a missed attack and pounces back, feints its leap), Trike (telegraphed Horn Ram, half damage while charging), Pachy (Headbutt drains 1 energy), Sarco (submerges every 3rd turn, then ambushes with a tight ring), Alpha Rex (phase 2 at 50%: summons a Compy, faster), Bog Spino (floods the arena: your next attack bar is muddy unless you braced).
- `scenes/Battle.js`: layout, targeting, the round loop, kills and boss phases, rewards. `battle/playerMoves.js` / `battle/enemyMoves.js`: animated moves wired to the QTEs. `battle/gimmicks.js`: defend, brace, submerge, flood, summon, phase-2 and death animations.
- `battle/anims.js`: attack animations (T-rex bite timing from the brief, pounce with feint, tail whip, roar, Compy swarm, Trike ram and horn charge). `animSet()` picks the set per species.
- `ui/battleUI.js`: HUDs (energy pips, crit streak, status tags), intent markers with the target arrow, and the move bar.
- `sprites/rexParts.js` + `sprites/rig.js`: the T-rex part rig and the whole-sprite rig.
- `systems/qte.js`: attack bar and defend ring. `systems/fx.js`: shake, hitstop, kill cam, sparks, numbers. `systems/sfx.js`: generated sounds. `systems/music.js`: generated music (see Music).

**Testing matchups:** `http://localhost:5173/?p=compy&e=compy-s,compy-s,compy-s&t=venomBite` skips the hatchery. `p` is the player species, `e` a comma list of enemies (`-s` = small pack member, `boss` = the zone boss), `t` an optional trait id, `z` the zone (`z=swamp`).

## Adding a new species sprite

1. If it needs new colors, add single-character keys to `src/data/palette.js` (3-4 per species: base, shade, belly, plus any accent).
2. Draw the grid in `src/sprites/grids.js`. One string per row, every row the same width, facing **right**. `.` is transparent, `O` is the outline.
3. Add it to the `GRIDS` registry (`pachy: PACHY`). Add a row to `CROUCH_DROP`: the mid-body row that gets dropped to make the crouch frame.
4. Add stats and a rarity in `src/data/species.js`. The hatch spin picks it up automatically unless it is marked `enemyOnly: true`. Add its id to `DEX_ORDER` in `scenes/Home.js` so it shows in the Dino-dex.
5. Add a head for its move-button icon in `SPECIES_HEAD` (`sprites/moveIcons.js`).
6. Optional: give it its own animations through the `SETS` overrides in `battle/anims.js`. Otherwise it uses the generic pounce and tail whip.

Boot renders three textures for it: `pachy`, `pachy_flash` (hit flash) and `pachy_crouch`.

An unknown palette character logs a warning in the console, so typos are easy to spot.
