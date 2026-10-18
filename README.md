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
Keys: **1–5** pick moves (and popup options), **E** ends your turn, **← →** (or tapping an enemy) picks the target, **Space / Enter / click / tap** for the timing QTEs, **↑↓ + Enter** on the map, **S** opens Settings on Home (**U** unlocks, **G** goals, **F** family tree, **X** Extinction; **Q / E** flip their pages, **Esc** goes back), **D** (or tapping the Dino-dex) flips its pages. On phones, tap everything.

**Portrait and landscape.** The game has two base resolutions: 320x180 (landscape) and 180x320 (portrait), the same pixel size on a phone. `W` / `H` / `GROUND_Y` in `src/config.js` are live bindings switched by `setPortrait()`, and each scene picks its layout with `lp(landscape, portrait)` (portrait: stacked Home panels, a vertical map climbing to the boss, a battle stage with dinos at 2x, HUDs above and below, and a 3x2 move grid). Rotating rebuilds calm screens (Title, Home, Nest, Map) right away; fights, hatches and end screens switch at the next scene (`syncLayout()` in `systems/screen.js`). Zone backdrops are always drawn at landscape size and placed / cropped for portrait. On phones the canvas scales to fill (fractional at 2x+ density), keeps clear of notches, and the first tap goes fullscreen where the browser allows it.

Scaling is integer-only by design (crisp pixels), so some screens show black borders around the game.

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

**Balance sim.** The numbers are tuned with a headless sim that plays full runs on the real combat rules (`systems/battleState.js` + `systems/build.js`) with probabilistic QTE results, a simple "brace big hits, special when affordable, else bite" policy, and random fossil / mutation picks. `src/systems` and `src/run` contain no Phaser code, so the sim imports them directly. Three player profiles:
- **Skilled:** 40% crits, 45% perfect dodges, 45% blocks.
- **Decent:** 25% crits, 30% dodges, 45% blocks.
- **Average:** 10% crits, 10% dodges, 40% blocks.

The difficulty levers live in data:
- **Lives and retries:** `BASE_LIVES` (2) and `RETRY_HP` (40%) in `data/progression.js`.
- **Zone strength:** each zone's `scale` in `data/zones.js`, plus `RAMP` (enemies go from 80% at a zone's first column to 130% at its last).
- **Healing:** `NEST_HEAL` (30%) and `ZONE_HEAL` (35%).

Fresh save (base fossil pool, 2 lives), 300 runs each. Each column is the share of runs that cleared that zone:

| Species | Skilled: Jungle | Skilled: Swamp | Decent: Jungle | Decent: Swamp |
|---|---|---|---|---|
| Compy (Common) | 79% | 36% | 39% | 5% |
| Raptor (Rare) | 93% | 51% | 64% | 18% |
| Trike (Epic) | 95% | 71% | 70% | 34% |
| T-Rex (Legendary) | 100% | 75% | 94% | 44% |

A strong player can win early. A decent one clears the Jungle within a few runs and the Swamp after some unlocks and practice. Average players mostly die in the Jungle until they learn the timing.

All four zones with a veteran save (every fossil pack, Sturdy Blood 3, Nine Lives), 400 runs each:

| Species | Skilled (J / S / V / Crater) | Decent (J / S / V / Crater) |
|---|---|---|
| Compy | 77 / 35 / 17 / 5% | 42 / 9 / 2 / 0% |
| Raptor | 90 / 54 / 30 / 8% | 59 / 12 / 4 / 1% |
| Trike | 92 / 72 / 39 / 14% | 64 / 27 / 9 / 2% |
| T-Rex | 99 / 81 / 63 / 20% | 91 / 40 / 18 / 2% |

Usage: `node sim2.mjs <root> 300`. Env: `NEW=1` (fresh pool), `ZONES=4`, `VET=1`, `EXT=n`, `ONLY=compy,rex`, `PLAYS=skilled,decent`.

### The run

`run/run.js` holds the run state (dino stats, XP, evolution, upgrades) and `run/mapgen.js` builds the branching map. The scenes are `Map` (travel; Nest / Fossil Dig / Meteor / Shop visits live in `scenes/mapNodes.js`) → `Battle` → `Evolution` (at LV5 / LV10) → `RunEnd` (victory: banks Amber and crowns the species in the Dino-dex). Each run has 2 lives (3 with Nine Lives). Losing a fight costs one and restarts that fight at 40% HP. At 0 lives the dino goes to the `Fossil` screen, which banks Amber. Both end screens run the final goal check and the Bloodline pick (`ui/bloodline.js`), and add the dino to the family tree. `Home` is the hub: Dino-dex, the Nest menus, and stats. The current run itself is not saved; refreshing mid-run returns you to Home.

### Zones

A run goes through the zones it has (`run.zones`: `ZONE_ORDER` in `data/zones.js` minus zones still locked in the Nest):
- **Jungle**: Compy, Raptor, Elite Trike, boss Alpha Rex (summons a Compy).
- **Swamp** (LV5–8): Pachy, Sarco, Elite Sarco / Raptor, boss Bog Spino (floods the arena).
- **Volcano** (LV9–12, a 200 Amber Nest unlock): Ankylo (guards, then a charged Club Swing that stuns on a clean hit), Dimetrodon (basks to heal 20%), Pteranodon (dives; dodges sloppy attacks), Elite Ankylo / Dimetrodon, boss **Cinder Stego** (spiked guard, Magma Tail; phase 2 summons a Pteranodon).
- **Meteor Crater** (LV13–16, 400 Amber, needs the Volcano): Carno (enrages at half HP), Stego (raises spikes: hitting it while guarded pricks you), Raptor packs, Elite Carno / Stego, final boss **Meteor Titan** (Starfall; phase 2 summons a Raptor and speeds up).

Beating a zone boss gives XP and Amber, heals `ZONE_HEAL` (35%), and `advanceZone()` in `run/run.js` builds the next zone's map. Level, XP, traits, lives and Amber carry over. `RunEnd` only comes after the run's last zone. Battle and Map pick their backdrop per zone (`ui/zoneArt.js` for Jungle / Swamp, `ui/zoneArt2.js` for Volcano / Crater, `drawMapBackground` in `ui/backdrop.js`). The Crater's meteor grows in the sky as you get closer to the boss. To add a zone, add an entry to `ZONES` and `ZONE_ORDER`, plus its layers in the zone art registry.

There are 11 hatchable species: Compy, Pachy, Ankylo (Common); Raptor, Sarco, Pteranodon (Rare); Trike, Spino, Stego (Epic); T-Rex, Carno (Legendary). Ankylo, Pteranodon, Stego and Carno are Nest eggs (`unlock` in `data/species.js`; `hatchable()` in `systems/meta.js` filters the hatch pool). Their specials: Club Smash (a crit stuns), Dive Bomb (can't miss), Thagomizer (poisons 2), Gore Rush (+50% against targets under half HP). Each has two evolved forms with perks (`data/forms.js`, `sprites/forms.js`). Their sprites are built with a small shape builder (`sprites/shapes.js`, `sprites/grids2.js`). Dimetrodon is `enemyOnly`. The Dino-dex shows 4 species per page. The Swamp's wildlife and the Bog Spino have their own stat blocks (`enemyBase` and `boss.base` in `data/zones.js`), so the hatchable Pachy, Sarco and Spino can be tuned without moving the zone. Their specials are Skull Bash (pierces DEF), Death Roll (3 bites) and Swamp Surge (charges up, then hits with a tight dodge window).

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

### Art (v2 Phase 4)

- **Palette**: all sprite art is locked to Endesga 32 (`data/palette.js`). `PAL` keys are picked from it, and `renderSprite.js` snaps every pixel (evolution hue shifts, skins, fossils) to the nearest entry with `toEndesga()`. `E32` names the palette for code-drawn backgrounds and UI.
- **Battle composition**: dinos stand at 3x on a ground line at y 132 (`GROUND_Y`), with the player at x 80. Small pack members and summoned minions stay at 2x so a 3-enemy pack fits. Every battle and title dino has a soft drop shadow (`rig.addShadow()`). Enemy markers stay below the HUD for tall sprites (`MARK_TOP`).
- **Backdrops** (`ui/zoneArt.js`): Jungle and Swamp each have 4 layers (sky, far, mid + ground, near/foreground), pre-rendered to textures once. Layers sway 1–2px, lean against lunges (`backdrop.shift`), and ambient bits keep moving: light shafts, fireflies and falling leaves in the Jungle; mist bands, bubbles and dragonflies in the Swamp. The foreground ferns / cattails draw in front of the dinos.
- **UI**: stone panels (`ui/pixel.js` `panel()`: top highlight, dark bottom edge, corner rivets, speckle), 8x8 move icons (`sprites/moveIcons.js`; the special shows the species head), titles (scale 2+) with a 2px shadow and a 1px highlight, a 3x5 small font (`ui/fontSmall.js`, `text(..., { small: true })`) for sub-lines, captions and descriptions, rarity glow on the hatch card and rarity cards in the Dino-dex.
- **Juice**: hitstop 60ms on hits and 120ms on crits; shake scaled by the share of HP a hit takes; dust puffs on hops and landings; leaf / water-drop debris on hits; damage numbers in the 2x font on a small arc (crits flash white, then go gold); deaths flash white 3 times and dissolve into falling pixels (`deathAnim` in `battle/gimmicks.js`); 150ms fades; hatch reels take 1.5s in total and a tap skips them.

### Hatching

`scenes/Hatch.js` handles the egg, the species spin, the trait spin, rerolls, and START RUN. The reels are in `ui/reel.js`, the buttons in `ui/button.js`, and the egg in `sprites/egg.js`.

### Battle code (v2 combat)

Each round: every enemy shows an **intent** (what it will do next, with exact damage) → you spend **energy** (max 3, +2 a turn) on as many moves as you can afford → **END TURN** → each enemy does what it showed. Brace (1 energy) turns missed dodges into blocks until your next turn. A perfect dodge earns a free counter-bite. 3 crits in a row empower your next attack. Roar hits every enemy; Swarm spreads its 3 hits across them.

- `systems/battleState.js`: the pure turn rules (energy, intents, strikes, enemy actions, boss phases). Shared by the scene and the balance sim.
- `data/brains.js`: enemy behaviour. Compy packs, Raptor (evades a missed attack and pounces back, feints its leap), Trike (telegraphed Horn Ram, half damage while charging), Pachy (Headbutt drains 1 energy), Sarco (submerges every 3rd turn, then ambushes with a tight ring), Alpha Rex (phase 2 at 50%: summons a Compy, faster), Bog Spino (floods the arena: your next attack bar is muddy unless you braced).
- `scenes/Battle.js`: layout, targeting, the round loop, kills and boss phases, rewards. `battle/playerMoves.js` / `battle/enemyMoves.js`: animated moves wired to the QTEs. `battle/gimmicks.js`: defend, brace, submerge, flood, summon, phase-2 and death animations.
- `battle/anims.js`: attack animations (T-rex bite timing from the brief, pounce with feint, tail whip, roar, Compy swarm, Trike ram and horn charge). `animSet()` picks the set per species.
- `ui/battleUI.js`: HUDs (energy pips, crit streak, status tags), intent markers with the target arrow, and the move bar.
- `sprites/rexParts.js` + `sprites/rig.js`: the T-rex part rig and the whole-sprite rig.
- `systems/qte.js`: attack bar and defend ring. `systems/fx.js`: shake, hitstop, kill cam, sparks, numbers. `systems/sfx.js`: generated sounds.

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
