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

Title → Home (Dino-dex, Lineage, Settings) → Hatch an egg → Jungle map → fights → Alpha Rex → Swamp map → fights → Bog Spino.
Keys: **1–5** pick moves (and popup options), **E** ends your turn, **← →** (or tapping an enemy) picks the target, **Space / Enter / click / tap** for the timing QTEs, **↑↓ + Enter** on the map, **S** opens Settings on Home, **D** (or tapping the Dino-dex) flips its pages. On phones, tap everything. Landscape is best, and portrait shows a hint to rotate.

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
- `src/data/lineage.js`: Lineage bonuses (per-stack value, caps), base lives, retry HP.
- `src/systems/save.js`: versioned localStorage save (`SAVE_VERSION` plus `migrate()`). `src/systems/meta.js` holds the loaded save; call `persist()` after changing it. To start over, run `localStorage.removeItem('dino-conquest:save')` in the browser console.

- `src/data/zones.js`: zone layout, enemy groups (`fights` / `elites`, 1–3 enemies each) and levels, a per-zone difficulty `scale`, the zone order (`ZONE_ORDER`), the heal between zones (`ZONE_HEAL`), enemy HP/ATK scaling per node type, rewards, node odds. A boss can carry its own `base` stat block, and each zone has an `enemyBase` for its wildlife, so tuning a hatchable species never changes the zones' enemies.
- `src/data/progression.js`: XP curve, per-level growth, evolution levels and boost.
- `src/data/events.js` / `src/data/upgrades.js`: Meteor Shard events and Fossil Dig stat upgrades.

**Balance sim.** The numbers are tuned with a headless sim that plays full runs (Jungle → Swamp) on the real combat rules (`systems/battleState.js`) with probabilistic QTE results and a simple "brace big hits, special when affordable, else bite" policy. `src/systems` and `src/run` contain no Phaser code, so the sim imports them directly. v2 combat, 400 runs each with 3 lives:

| Play | Species | Clears Jungle | Clears both zones |
|---|---|---|---|
| Decent | Compy (Common) | 72% | 44% |
| Decent | Pachy (Common) | 72% | 39% |
| Decent | Raptor (Rare) | 87% | 75% |
| Decent | Sarco (Rare) | 90% | 78% |
| Decent | Trike (Epic) | 94% | 90% |
| Decent | Spino (Epic) | 97% | 81% |
| Decent | T-Rex (Legendary) | 100% | 95% |
| Average | Compy (Common) | 19% | 3% |
| Average | Pachy (Common) | 21% | 3% |
| Average | Raptor (Rare) | 46% | 16% |
| Average | Sarco (Rare) | 44% | 18% |
| Average | Trike (Epic) | 56% | 27% |
| Average | Spino (Epic) | 61% | 19% |
| Average | T-Rex (Legendary) | 82% | 49% |

Fights last about 4–6 rounds. The first two map columns only hold a Compy pair, so new players get a gentle opener. Phase 3's meta unlocks are meant to carry players through the Swamp over several runs.

### The run

`run/run.js` holds the run state (dino stats, XP, evolution, upgrades) and `run/mapgen.js` builds the branching map. The scenes are `Map` (travel plus Nest / Fossil Dig / Meteor popups) → `Battle` → `Evolution` (at LV5 / LV10) → `RunEnd` (victory: banks Amber, gives 2 Lineage picks via `run/lineagePick.js`, and crowns the species in the Dino-dex). Each run has 3 lives. Losing a fight costs one and restarts that fight at 50% HP. At 0 lives the dino goes to the `Fossil` screen, which banks Amber, records the fossil, and offers a Lineage bonus pick. `Home` is the hub: Dino-dex, Lineage, and stats. The current run itself is not saved; refreshing mid-run returns you to Home.

### Zones

A run goes through `ZONE_ORDER` in `data/zones.js`: **Jungle** (Compy, Raptor, Elite Trike, boss Alpha Rex), then **Swamp** (Pachy, Sarco, Elite Sarco/Raptor, boss Bog Spino, enemies LV5–8). Beating a zone boss gives XP and Amber, heals `ZONE_HEAL` (50%), and `advanceZone()` in `run/run.js` builds the next zone's map. Level, XP, traits, lives and Amber carry over. `RunEnd` only comes after the last zone's boss. Battle and Map pick their backdrop per zone (`drawZone` / `drawMapBackground` in `ui/backdrop.js`). To add a zone, add an entry to `ZONES` and `ZONE_ORDER`, plus a backdrop function in `BACKDROPS`.

There are 7 hatchable species: Compy and Pachy (Common), Raptor and Sarco (Rare), Trike and Spino (Epic), T-Rex (Legendary). A species marked `enemyOnly: true` in `data/species.js` would stay out of the hatch spin and the Dino-dex (`HATCHABLE` is the hatch list); none use it right now. The Dino-dex shows 4 species per page. The Swamp's wildlife and the Bog Spino have their own stat blocks (`enemyBase` and `boss.base` in `data/zones.js`), so the hatchable Pachy, Sarco and Spino can be tuned without moving the zone. Their specials are Skull Bash (pierces DEF), Death Roll (3 bites) and Swamp Surge (charges up, then hits with a tight dodge window).

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

**Testing matchups:** `http://localhost:5173/?p=compy&e=compy*,compy*,compy*&t=venomBite` skips the hatchery. `p` is the player species, `e` a comma list of enemies (`*` = small pack member, `boss` = the zone boss), `t` an optional trait id, `z` the zone (`z=swamp`).

## Adding a new species sprite

1. If it needs new colors, add single-character keys to `src/data/palette.js` (3-4 per species: base, shade, belly, plus any accent).
2. Draw the grid in `src/sprites/grids.js`. One string per row, every row the same width, facing **right**. `.` is transparent, `O` is the outline.
3. Add it to the `GRIDS` registry (`pachy: PACHY`). Add a row to `CROUCH_DROP`: the mid-body row that gets dropped to make the crouch frame.
4. Add stats and a rarity in `src/data/species.js`. The hatch spin picks it up automatically unless it is marked `enemyOnly: true`. Add its id to `DEX_ORDER` in `scenes/Home.js` so it shows in the Dino-dex.
5. Optional: give it its own animations through the `SETS` overrides in `battle/anims.js`. Otherwise it uses the generic pounce and tail whip.

Boot renders three textures for it: `pachy`, `pachy_flash` (hit flash) and `pachy_crouch`.

An unknown palette character logs a warning in the console, so typos are easy to spot.
